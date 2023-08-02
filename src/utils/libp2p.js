import { noise } from "@chainsafe/libp2p-noise";
import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";
import { identify } from "@libp2p/identify";
import { mplex } from "@libp2p/mplex";
import { webSockets } from "@libp2p/websockets";
import * as filters from "@libp2p/websockets/filters";
import { multiaddr } from "@multiformats/multiaddr";
import { createLibp2p } from "libp2p";
import { createHa } from "./ha";

export async function createNode() {
  const node = await createLibp2p({
    transports: [
      webSockets({
        filter: filters.all
      }),
      circuitRelayTransport()
    ],
    streamMuxers: [mplex()],
    connectionEncryption: [noise()],
    services: {
      identify: identify(),
      ha: createHa()
    },
    connectionGater: {
      denyDialMultiaddr: () => {
        return false;
      }
    },
    connectionManager: {
      minConnections: 0
    }
  });
  return node;
}

export function pingWs(uri) {
  return new Promise((res, rej) => {
    const timeoutId = setTimeout(() => {
      rej(new Error("timeout"));
    }, 10000);
    const ws = new WebSocket(uri);
    ws.addEventListener("error", () => {
      clearTimeout(timeoutId);
      rej(new Error("connect"));
    });
    ws.addEventListener("open", () => {
      ws.close();
      clearTimeout(timeoutId);
      res();
    });
  });
}

export async function checkMultiaddr(multiaddress) {
  let protocol = "ws";
  if (location.protocol === "https:") {
    protocol = "wss";
  }

  const localMultiaddr = multiaddr(multiaddress);
  const protoNames = localMultiaddr.protoNames();

  const check = () => {
    if (protocol === "wss") {
      return protoNames.includes("wss");
    }
    return protoNames.includes("ws") || protoNames.includes("wss");
  };

  if (check()) {
    if (protoNames.includes("p2p-circuit")) {
      return localMultiaddr;
    } else {
      const address = localMultiaddr.nodeAddress();
      try {
        await pingWs(
          `${protoNames.includes("wss") ? "wss" : "ws"}://${address.address}:${
            address.port
          }`
        );
        return localMultiaddr;
      } catch (error) {
        console.log(error);
      }
    }
  }

  return false;
}

let node = null;

export async function start(cb) {
  if (node) {
    return node;
  }
  node = await createNode();
  await node.start();
  console.log(`Node started with id ${node.peerId.toString()}`);

  async function updateConnectionsList() {
    const connections = node.getConnections().map(item => {
      return item.remoteAddr.toString();
    });
    console.log("Update Connections List", connections);
    cb(connections);
  }

  node.addEventListener("connection:open", event => {
    console.log("connected", event.detail.remoteAddr.toString());
    updateConnectionsList();
  });

  node.addEventListener("connection:close", event => {
    console.log("disconected", event.detail.remoteAddr.toString());
    updateConnectionsList();
  });

  node.addEventListener("peer:discovery", evt => {
    console.log("Discovered:", evt.detail.id.toString());
  });

  return node;
}

export async function connect(addr) {
  if (!node) {
    return false;
  }
  const connection = node.getConnections().find(item => {
    return item.remoteAddr.toString() === addr;
  });
  if (connection) {
    return connection;
  }
  try {
    const listenerMultiaddr = multiaddr(addr);
    return await node.dial(listenerMultiaddr);
  } catch (error) {
    console.log(error);
  }
  return false;
}

export function request(peerId, data) {
  const connection = node.getConnections().find(item => {
    return item.remotePeer.toString() === peerId;
  });
  if (node && connection) {
    return node.services.ha.request(connection, "/call", data);
  }
  throw new Error("error");
}
