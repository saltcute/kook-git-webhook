import { client } from "init/client"
import * as fs from "fs"
import upath from "upath"
import crypto from "crypto"

import { addWebhooks } from "api"
import { getIV, IV } from "menu/gitnya/lib"

;(async () => {
    const list =
        (await client.config.getOne("gitnya::webhooks.channel.list")) || []
    const newList = []
    for (const UUID of list) {
        const store = await client.config.getOne(
            `gitnya::webhooks.channel.mappings.${UUID}`
        )
        if (!store) {
            continue
        }
        let { channelId, secret, iv, repo } = store
        if (!iv) {
            const decrypted = crypto
                .createDecipheriv(
                    "aes-256-gcm",
                    (await client.config.getOne("gitnya::webhooks.key")).padEnd(
                        32
                    ),
                    IV
                )
                .update(Buffer.from(secret, "base64"))
                .toString("utf8")
            client.config.set(
                `gitnya::webhooks.channel.mappings.${UUID}`,
                undefined
            )
            client.config.set(
                `gitnya::webhooks.channel.secrets.${secret}`,
                undefined
            )

            const newId = crypto
                .createHash("md5")
                .update(channelId)
                .digest("base64url")
            client.config.set(`gitnya::webhooks.channel.mappings.${newId}`, {
                channelId,
                repo,
                secret,
                iv: Buffer.from(IV).toString("base64"),
            })
            newList.push(newId)

            client.logger.warn(
                `Found legacy storage: ${decrypted}. Converted to new style.`
            )
        } else {
            newList.push(UUID)
        }
        const hash = crypto.createHash("md5").update(secret).digest("base64url")
        addWebhooks(secret, hash, channelId)
    }
    client.config.set("gitnya::webhooks.channel.list", newList)

    await client.connect()
    const basicPath = upath.join(__dirname, "menu")
    const menus = fs.readdirSync(basicPath)
    for (const menu of menus) {
        try {
            require(upath.join(basicPath, menu, "index"))
        } catch (e) {
            client.logger.error("Error loading menu")
            client.logger.error(e)
        }
    }
})()
