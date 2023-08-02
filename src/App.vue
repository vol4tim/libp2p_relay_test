<template>
  <div>
    <div v-if="peerId">
      <h2 v-if="peerId">peerId: {{ peerId }}</h2>
      <br />
      <br />
      <div>
        <input v-model="multiaddress" type="text" />
        <br />
        <button @click="connectClick">connect</button>
      </div>
      <br />
      <br />

      <div v-if="connections.length > 1" style="width: 800px; margin: 0 auto">
        <h4>Connections</h4>
        <ul style="text-align: left">
          <li
            v-for="(connection, k) in connections"
            :key="k"
            style="margin: 10px"
          >
            {{ connection }}
          </li>
        </ul>
      </div>

      <div v-if="connectionPeerId">
        control: {{ connectionPeerId }}
        <br />
        <br />
        <button @click="launchClick">{{ stateLamp }}</button>
        <pre
          v-if="data"
          style="
            text-align: left;
            width: 400px;
            margin: 0 auto;
            border: 1px solid #eee;
            padding: 10px;
          "
          >{{ data }}</pre
        >
      </div>
    </div>
    <button v-else @click="startClick">start node</button>

    <div>{{ error }}</div>
  </div>
</template>

<script>
import { useData } from "@/utils/hook";
import { computed, ref } from "vue";

export default {
  setup() {
    const connections = ref([]);
    const error = ref();
    const multiaddress = ref();

    const {
      data,
      connectionPeerId,
      updateTime,
      run,
      launch,
      connectPeer,
      peerId
    } = useData();

    const startClick = async () => {
      await run(conns => {
        connections.value = conns;
      });
    };

    const connectClick = async () => {
      const conn = await connectPeer(multiaddress.value);
      if (conn) {
        select(conn.remoteAddr.toString());
        multiaddress.value = "";
      }
    };

    const stateLamp = computed(() => {
      let state = "on";
      if (data.value && data.value.data.lamp.state === "on") {
        state = "off";
      }
      return state;
    });

    const launchClick = async () => {
      error.value = undefined;
      if (!connectionPeerId.value) {
        return;
      }
      let state = "on";
      if (data.value && data.value.data.lamp.state === "on") {
        state = "off";
      }
      try {
        await launch(connectionPeerId.value, {
          device: "lamp",
          state: state
        });
      } catch (e) {
        error.value = e.message;
      }
    };

    const select = conn => {
      connectionPeerId.value = conn;
      data.value = null;
      error.value = undefined;
    };

    return {
      multiaddress,
      data,
      updateTime,
      startClick,
      connectClick,
      launchClick,
      peerId,
      connectionPeerId,
      stateLamp,
      connections,
      select,
      error
    };
  }
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
