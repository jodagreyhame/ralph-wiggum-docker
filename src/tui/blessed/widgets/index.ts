/**
 * Blessed Widgets Barrel Export
 */

// Project List
export {
  createProjectListTable,
  updateProjectListTable,
  createStatsBar,
  createEmptyState,
  createProjectListFooter,
  updateProjectListFooter,
} from "./ProjectList.js";
export type { ProjectListOptions } from "./ProjectList.js";

// Project Detail
export { ProjectDetailContainer } from "./ProjectDetail.js";
export type { ProjectDetailOptions } from "./ProjectDetail.js";

// Modal
export {
  createModal,
  createHelpModal,
  createConfirmModal,
  createDeleteConfirmModal,
} from "./Modal.js";
export type { ModalOptions } from "./Modal.js";

// Tab Bar
export { createTabBar, updateTabBar, getTabByIndex, getNextTab, getPrevTab } from "./TabBar.js";
export type { TabBarOptions } from "./TabBar.js";

// Status Bar
export {
  createProjectListStatusBar,
  updateProjectListStatusBar,
  createProjectDetailStatusBar,
  updateProjectDetailStatusBar,
} from "./StatusBar.js";
export type { StatusBarOptions } from "./StatusBar.js";

// Config Editor
export { ConfigEditorContainer } from "./ConfigEditor.js";
export type { ConfigEditorOptions } from "./ConfigEditor.js";

// Config Editor Tab Bar
export {
  createConfigEditorTabBar,
  updateConfigEditorTabBar,
  getConfigTabByIndex,
  getNextConfigTab,
  getPrevConfigTab,
} from "./ConfigEditorTabBar.js";
export type { ConfigEditorTabBarOptions } from "./ConfigEditorTabBar.js";
