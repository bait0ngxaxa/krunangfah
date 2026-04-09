"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

interface ElementSize {
    width: number;
    height: number;
}

interface MeasuredElement<T extends HTMLElement> {
    isReady: boolean;
    ref: RefObject<T | null>;
    size: ElementSize;
}

const INITIAL_SIZE: ElementSize = { width: 0, height: 0 };

export function useElementSize<T extends HTMLElement>(): MeasuredElement<T> {
    const ref = useRef<T | null>(null);
    const [size, setSize] = useState<ElementSize>(INITIAL_SIZE);

    useEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }

        const updateSize = (): void => {
            const nextSize = {
                width: element.clientWidth,
                height: element.clientHeight,
            };

            setSize((currentSize) =>
                currentSize.width === nextSize.width &&
                currentSize.height === nextSize.height
                    ? currentSize
                    : nextSize,
            );
        };

        updateSize();

        const observer = new ResizeObserver(updateSize);
        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    return {
        isReady: size.width > 0 && size.height > 0,
        ref,
        size,
    };
}
