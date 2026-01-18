/**
 * TUI Screens (chalk-based, no React)
 */

export { renderProjectScreen } from "./project.js";
export { renderBuilderScreen } from "./builder.js";
export { renderReviewerScreen } from "./reviewer.js";
export { renderArchitectScreen } from "./architect.js";
export { renderLoopScreen } from "./loop.js";
export { renderSummaryScreen } from "./summary.js";

// Dashboard screens
export {
  renderProjectListScreen,
  getProjectListFooterInfo,
  getProjectListFooterKeys,
} from "./ProjectListScreen.js";
export {
  renderProjectDetailScreen,
  getProjectDetailFooterInfo,
  getProjectDetailFooterKeys,
  renderTaskDetailModal,
} from "./ProjectDetailScreen.js";
