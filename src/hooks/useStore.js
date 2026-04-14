import { useEffect, useRef, useState } from "react";

// 持久化状态：把 state 同步到 localStorage
//
// 用法：
//   useStore(key, initialValue)                         // 简单用法
//   useStore(key, () => expensiveInit())                // 惰性初始化
//   useStore(key, init, {                               // 带版本迁移
//     version: 3,
//     migrate: (oldValue, oldVersion) => newValue,      // 可选
//   })
//
// 说明：
// - init 支持函数形式，只在首次挂载时执行一次，避免每次 render 都重算 seed 数据。
// - 如果 options.version 与 localStorage 里存的 __v 不一致，会调用 migrate 迁移，
//   迁移失败则回退到 init，保证老数据形状变更不会让页面 crash。
// - 写入 localStorage 加了 try/catch，避免隐私模式或配额超限时白屏。
export function useStore(key, init, options = {}) {
    const { version = 1, migrate } = options;
    const versionRef = useRef(version);

    const computeInit = () => (typeof init === "function" ? init() : init);

    const [value, setValue] = useState(() => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return computeInit();

            const parsed = JSON.parse(raw);
            // 兼容老数据：没有 __v 字段则视为 version=1
            const storedVersion = parsed && typeof parsed === "object" && "__v" in parsed
                ? parsed.__v
                : 1;
            const storedValue = parsed && typeof parsed === "object" && "value" in parsed
                ? parsed.value
                : parsed; // 更老的数据：整体就是 value，没包装

            if (storedVersion === version) return storedValue;

            // 版本不一致：尝试迁移
            if (typeof migrate === "function") {
                try {
                    const migrated = migrate(storedValue, storedVersion);
                    return migrated ?? computeInit();
                } catch (err) {
                    console.warn(`[useStore] migrate failed for "${key}":`, err);
                    return computeInit();
                }
            }
            // 没有迁移函数：直接重置，避免用旧 shape 的数据 crash 页面
            return computeInit();
        } catch (err) {
            console.warn(`[useStore] read failed for "${key}":`, err);
            return computeInit();
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(
                key,
                JSON.stringify({ __v: versionRef.current, value })
            );
        } catch (err) {
            // 隐私模式或配额超限：不 crash，只记录
            console.warn(`[useStore] write failed for "${key}":`, err);
        }
    }, [key, value]);

    return [value, setValue];
}
