// @keepai/cli — SDK entry point
export { KeepAI, KeepAIError, type KeepAIOptions, type StatusResult, type KeepAIEvent } from './sdk.js';
export {
  loadIdentity,
  loadConfig,
  saveIdentity,
  saveConfig,
  deleteStorage,
  isPaired,
  getConfigDir,
  type Identity,
  type ClientConfig,
} from './storage.js';
