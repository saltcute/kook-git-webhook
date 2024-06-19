import { client } from "init/client";
import * as fs from 'fs';
import upath from 'upath';
import crypto from 'crypto';

import { addWebhooks } from "api";

(async () => {
    const list = await client.config.getOne('gitnya::webhooks.channel.list') || [];
    for (const UUID of list) {
        const store = await client.config.getOne(`gitnya::webhooks.channel.mappings.${UUID}`);
        if (!store) continue;
        const { channelId, secret } = store;
        const hash = crypto.createHash('md5').update(secret).digest('base64url');
        addWebhooks(secret, hash, channelId);
    }

    await client.connect()
    const basicPath = upath.join(__dirname, 'menu');
    const menus = fs.readdirSync(basicPath);
    for (const menu of menus) {
        try {
            require(upath.join(basicPath, menu, "index"));
        } catch (e) {
            client.logger.error('Error loading menu');
            client.logger.error(e);
        }
    }
})()