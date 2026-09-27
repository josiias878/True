import React from "react"

// Ersatz für next/link in der eigenständigen App (keine Next.js-Router).
export default function Link({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a href={href} {...rest}>{children}</a>
}
