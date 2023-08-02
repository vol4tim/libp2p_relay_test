import { ref } from "vue";
import { checkMultiaddr, connect, request, start } from "./libp2p";

export const useData = () => {
  const data = ref(null);
  const updateTime = ref(null);
  const peerId = ref(null);
  const connectionPeerId = ref(null);

  const run = async cb => {
    const node = await start(cb);
    peerId.value = node.peerId.toString();
    listen(node);
    return true;
  };

  const listen = async node => {
    try {
      const protocols = node.getProtocols();
      if (protocols.includes("/update")) {
        await node.unhandle("/update");
      }
      node.services.ha.handle(
        "/update",
        async (dataRaw, stream, fromConnection) => {
          console.log("from", fromConnection.remotePeer.toString());
          console.log(connectionPeerId.value);
          if (connectionPeerId.value === fromConnection.remoteAddr.toString()) {
            data.value = dataRaw;
            updateTime.value = Date.now();
            await node.services.ha.utils.sendResponse(stream, {
              result: true
            });
          } else {
            console.log("skip update");
          }
        }
      );
    } catch (error) {
      console.log(`Error: ${error.message}`);
      console.log(error);
    }
  };

  const connectPeer = async peer => {
    try {
      const multiaddress = await checkMultiaddr(peer);
      console.log("connect", multiaddress.toString());
      return await connect(multiaddress);
    } catch (error) {
      console.log(`Error: ${error.message}`);
      console.log(error);
    }
    return false;
  };

  const launch = async (peerId, command) => {
    console.log(`Launch command`, command);
    const peer = peerId.split("/");
    const response = await request(peer[peer.length - 1], { data: command });
    console.log(`response:`, response);
  };

  return {
    data,
    connectionPeerId,
    updateTime,
    run,
    connectPeer,
    launch,
    peerId
  };
};
