/**
 * 产品品牌配置
 * 统一管理用户可见的产品名称，避免硬编码散落
 */

/** 产品名称 - 全称 */
export const PRODUCT_NAME = "Agent 工程管理系统";

/** 产品名称 - 短称（用于收起侧边栏等空间受限场景） */
export const PRODUCT_NAME_SHORT = "Agent";

/** 产品内部标识（用于 package name、数据 key 等） */
export const PRODUCT_ID = "agent-engineering-manager";

/** 页面标题模板 */
export const PAGE_TITLE_TEMPLATE = (viewName?: string) => (viewName ? `${viewName} - ${PRODUCT_NAME}` : PRODUCT_NAME);
