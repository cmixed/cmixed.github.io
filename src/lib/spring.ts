/**
 * 弹簧参数的单一来源（由 scripts/build-spring.ts 生成，勿手改）。
 *
 * 滚动不能用 CSS：scrollTop 不是合成属性，只能逐帧写。这里只存参数，
 * 求值在运行时按「距离 + 松手速度」算 —— 那是编译期拿不到的量。
 */
export const PRESS = { zeta: 1, omega: 26 } as const;
export const SCROLL = { zeta: 0.85, omega: 18 } as const;
