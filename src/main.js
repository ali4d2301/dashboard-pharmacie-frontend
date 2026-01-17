import "./assets/main.css";

import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

createApp(App).use(router).mount("#app");
