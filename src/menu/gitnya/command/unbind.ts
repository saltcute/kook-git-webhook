import Kasumi, { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import crypto from 'crypto';
import menu from "..";

import { CustomStorage } from "../../../init/type";
import { removeWebhooks } from "../../../api";

class AppCommand extends BaseCommand<Kasumi<CustomStorage>> {
    name = 'unbind';

    description = '解除这个频道的绑定';
    func: CommandFunction<BaseSession, any> = async (session) => {
        if (!session.channelId) return session.reply('只能在服务器频道中使用此命令');
        const channelId = session.channelId;
        const UUID = crypto.createHash('md5').update(channelId).digest('base64url');
        const body = await this.client.config.getOne(`gitnya::webhooks.channel.mappings.${UUID}`);
        if (!body) {
            return session.reply('这个频道好像没有绑定过 WebHook 喵？');
        }
        let list = await this.client.config.getOne('gitnya::webhooks.channel.list') || [];
        list = list.filter(v => v !== UUID);
        this.client.config.set(`gitnya::webhooks.channel.mappings.${UUID}`, undefined)
            .set('gitnya::webhooks.channel.list', list);

        const hash = crypto.createHash('md5').update(body.secret).digest('base64url');
        removeWebhooks(hash);

        await session.reply('已解绑 WebHook 喵！');
    }
}

const command = new AppCommand();
export default command;
menu.addCommand(command);