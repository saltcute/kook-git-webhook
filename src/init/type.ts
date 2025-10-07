export interface CustomStorage {
    // add your custom storage properties here

    "gitnya::express.port": number
    "gitnya::webhooks.key": string
    "gitnya::webhooks.host": string

    /**
     * List of UUIDs
     */
    "gitnya::webhooks.channel.list"?: string[]

    [key: `gitnya::webhooks.channel.mappings.${string}`]:
        | {
              channelId: string
              secret: string
              iv: string
              repo?: string
          }
        | undefined
}
