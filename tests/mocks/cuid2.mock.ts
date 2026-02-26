export const createId = () => `mock_cuid_${  Math.random().toString(36).substring(2, 10)}`;
export const init = () => createId;
export const getConstants = () => ({});
export const isCuid = () => true;
