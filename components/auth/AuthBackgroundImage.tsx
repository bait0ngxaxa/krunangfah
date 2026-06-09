import Image from "next/image";

const AUTH_BACKGROUND_SRC = "/image/login_bg.webp";

export function AuthBackgroundImage(): React.ReactNode {
    return (
        <Image
            src={AUTH_BACKGROUND_SRC}
            alt=""
            aria-hidden="true"
            fill
            quality={70}
            sizes="100vw"
            loading="eager"
            fetchPriority="low"
            className="pointer-events-none select-none object-cover object-bottom"
        />
    );
}
