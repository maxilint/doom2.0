import { HolochainClient } from '@holochain-open-dev/cell-client'
import { AppWebsocket } from '@holochain/client'
import { APP_PORT, MAIN_APP_ID } from '../holochainConfig'

export async function getClient({ callback }) {
  const client = await setupClient()

  const appInfo = await client.appWebsocket.appInfo({
    installed_app_id: MAIN_APP_ID,
  })
  client.appInfo = appInfo
  const { unsubscribe } = client.addSignalHandler(callback)

  const cellId = client.appInfo.cell_data[0].cell_id
  return { client, cellId, unsubscribe }
}

// async function setupClient() {
//   const client = await HolochainClient.connect(
//     `ws://localhost:${APP_PORT}`,
//     MAIN_APP_ID
//   )
//   return client
// }

async function setupClient() {
  const appWebsocket = await AppWebsocket.connect(
    `ws://localhost:${APP_PORT}`
    // MAIN_APP_ID
  )

  const client = new HolochainClient(appWebsocket)

  return client
}
