import Kasumi, { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import crypto from 'crypto';
import menu from "..";

import { IV } from "../lib";
import { CustomStorage } from "../../../init/type";
import { addWebhooks } from "api";

class AppCommand extends BaseCommand<Kasumi<CustomStorage>> {
    name = 'bind';

    description = '绑定 GitHub 到此频道';
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.channelId) return session.reply('只能在服务器频道中使用此命令');
        let repo: string | undefined = session.args[0].trim();
        if (!repo.match(/^[a-zA-Z0-9]+\/[a-zA-Z0-9]+$/m)) {
            repo = undefined;
        }
        const channelId = session.channelId, guildId = session.guildId;
        const secret = crypto.createCipheriv('aes-256-gcm', (await this.client.config.getOne('gitnya::webhooks.key')).padEnd(32), IV).update(`${guildId}/${channelId}`, 'utf8').toString('base64');
        const hash = crypto.createHash('md5').update(secret).digest('base64url');
        let UUID = await this.client.config.getOne(`gitnya::webhooks.channel.secrets.${secret}`);
        if (UUID) {
            await session.reply('这个频道好像已经绑定过 WebHook了！');
            return session.reply(new Card()
                .addTitle("请像这样子添加 WebHook 喵!")
                .addDivider()
                .addText(`${repo ? `[点击此处](https://github.com/${repo}/settings/hooks) 或` : ""}前往你的 GitHub 仓库，然后点击 Settings -> Webhooks\n点击 Add webhook`)
                .addText(`按此处填写
Payload URL:
\`\`\`plain
${new URL(`/${hash}`, await this.client.config.getOne('gitnya::webhooks.host')).href}
\`\`\`
Content Type: application/json
Secret:
\`\`\`plain
${secret}
\`\`\``).addText('点击 Add webhook 完成绑定喵！'));
        }
        UUID = crypto.randomUUID();
        const list = await this.client.config.getOne('gitnya::webhooks.channel.list') || [];
        list.push(UUID);

        this.client.config.set(`gitnya::webhooks.channel.mappings.${UUID}`, { channelId, repo, secret });
        this.client.config.set('gitnya::webhooks.channel.list', list);
        this.client.config.set(`gitnya::webhooks.channel.secrets.${secret}`, UUID);

        addWebhooks(secret, hash, channelId);

        await session.reply(new Card()
            .addTitle("最后一步喵！")
            .addDivider()
            .addText(`${repo ? `[点击此处](https://github.com/${repo}/settings/hooks) 或` : ""}前往你的 GitHub 仓库，然后点击 Settings -> Webhooks\n点击 Add webhook`)
            .addText(`按此处填写
Payload URL:
\`\`\`plain
${new URL(`/${hash}`, await this.client.config.getOne('gitnya::webhooks.host')).href}
\`\`\`
Content Type: application/json
Secret:
\`\`\`plain
${secret}
\`\`\``).addText('点击 Add webhook 完成绑定喵！'));
    }
}

const command = new AppCommand();
export default command;
menu.addCommand(command);