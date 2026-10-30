import { useEffect, useState } from "react";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { getSocialMediaLinks, type SocialMediaLink } from "./api";

const icons = { INSTAGRAM: FaInstagram, FACEBOOK: FaFacebookF, YOUTUBE: FaYoutube, LINKEDIN: FaLinkedinIn, X: FaXTwitter };

export function SocialMediaLinks() {
  const [links, setLinks] = useState<SocialMediaLink[]>([]);
  useEffect(() => { void getSocialMediaLinks().then(setLinks); }, []);
  const supported = links.filter((link) => link.platform in icons);
  if (!supported.length) return null;
  return <section className="social-links" aria-label="Follow Lexho"><p>Follow us</p><div>{supported.map((link) => { const Icon = icons[link.platform as keyof typeof icons]; return <a key={`${link.platform}-${link.url}`} className={`social-${link.platform.toLowerCase()}`} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={link.label} title={link.label}><Icon aria-hidden="true" size={20} /></a>; })}</div></section>;
}
