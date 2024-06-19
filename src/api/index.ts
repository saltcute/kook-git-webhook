import axios from 'axios';
import express from 'express';
import { client } from "init/client";
import { Card, MessageType } from 'kasumi.js';
const app = express();

const markDelete: {
    [hash: string]: boolean
} = {};

export async function addWebhooks(secret: string, hash: string, channelId: string) {
    if (markDelete[hash]) {
        delete markDelete[hash];
        return;
    };


    const { Webhooks, createNodeMiddleware } = await import("@octokit/webhooks");
    const webhooks = new Webhooks({ secret });

    webhooks.on("ping", async ({ id, name, payload }) => {
        if (markDelete[hash]) return;
        const card = new Card();
        if (payload.repository) {
            card.addTitle("喵喵！")
                .addDivider();
            card.addText(`收到了来自 \`${payload.repository.full_name}'\` 的 ping 事件喵！`);
            await client.API.message.create(MessageType.CardMessage, channelId, card);
        }
    });

    webhooks.on("push", async ({ id, name, payload }) => {
        if (markDelete[hash]) return;
        function getBranchName() {
            return payload.ref.replace("refs/heads/", "");
        }
        function getBranchURL() {
            return `https://github.com/${payload.repository.full_name}/tree/${getBranchName()}`;
        }

        const card = new Card();
        card.addTitle(`${payload.repository.full_name} 上有新的 Push 事件`);
        if (payload.before.startsWith("0000000")) { // Creating a new branch
            card.addContext(`创建分支 [${getBranchName()}](${getBranchURL()})`);
        } else if (payload.after.startsWith("0000000")) { // Deleting a branch
            card.addContext(`删除分支 [${getBranchName()}](${getBranchURL()})`);
        } else {
            card.addContext(`${payload.head_commit ? `${payload.head_commit?.timestamp} 时` : ""}对 [${getBranchName()}](${getBranchURL()}) 的 ${payload.commits.length} 个 commit`)
            card.addContext(`[查看共 ${payload.commits.length} 个变动](${payload.compare})`);
        }

        if (payload.sender) {
            const avatarUrl = payload.sender.avatar_url;
            const avatar: Buffer = (await axios.get(avatarUrl, { responseType: 'arraybuffer' })).data;
            const { data, err } = await client.API.asset.create(avatar);
            if (err) throw err;
            const { url } = data;
            card.addModule({
                type: Card.Modules.Types.TEXT,
                text: {
                    type: Card.Parts.TextType.KMARKDOWN,
                    content: `[${payload.sender.login}](${payload.sender.html_url})\n[${payload.repository.full_name}](${payload.repository.html_url})`
                },
                mode: Card.Modules.AccessoryModes.LEFT,
                accessory: {
                    type: Card.Parts.AccessoryType.IMAGE,
                    src: url,
                    size: Card.Size.LARGE,
                    circle: false
                }
            })
        }
        if (payload.commits.length > 0) {
            let lastCommit = payload.before;
            for (const commit of payload.commits) {
                card.addDivider();
                card.addContext(`[${lastCommit.substring(0, 7)} -> ${commit.id.substring(0, 7)}](https://github.com/saltcute/playground/compare/${lastCommit.substring(0, 7)}...${commit.id.substring(0, 7)})`);
                card.addText(`**${commit.author.name}**\n - ${commit.message}`);
                lastCommit = commit.id;
            }
        }
        await client.API.message.create(MessageType.CardMessage, channelId, card);
    });

    const middleware = createNodeMiddleware(webhooks, { path: `/${hash}` });
    app.use(middleware);
}

export async function removeWebhooks(hash: string) {
    markDelete[hash] = true;
}

client.config.getOne("gitnya::express.port").then((port) => {
    app.listen(port, () => {
        client.logger.info(`WebHooks start listening on port ${port}`);
        client.logger.info(`Access it at http://localhost:${port}`);
    })
});