import type { SVGProps } from "react";

const basis = (pfad: React.ReactNode) =>
  function Icon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        {pfad}
      </svg>
    );
  };

export const IconHeute = basis(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></>);
export const IconTeam = basis(<><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c.6-3.4 2.8-5.2 5.5-5.2s4.9 1.8 5.5 5.2" /><circle cx="17" cy="9" r="2.5" /><path d="M15.5 14.4c2.6-.4 4.5 1.2 5 4.6" /></>);
export const IconRegelwerk = basis(<><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4" /><path d="M9 12h7M9 16h7" /></>);
export const IconEinstellungen = basis(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>);
export const IconAbmelden = basis(<><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4" /><path d="M6 12h10" /></>);
export const IconPlus = basis(<><path d="M12 5v14M5 12h14" /></>);
export const IconStift = basis(<><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>);
export const IconMuell = basis(<><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></>);
export const IconGlocke = basis(<><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>);
export const IconOrt = basis(<><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>);
export const IconFamilie = basis(<><circle cx="8" cy="7" r="2.6" /><path d="M3.5 19c.4-3.2 2.2-5 4.5-5s4.1 1.8 4.5 5" /><circle cx="16.5" cy="10.5" r="2" /><path d="M13.5 19c.3-2.3 1.5-3.6 3-3.6s2.7 1.3 3 3.6" /></>);
export const IconAbrechnung = basis(<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>);
export const IconDrucken = basis(<><path d="M7 8V3h10v5" /><rect x="3" y="8" width="18" height="9" rx="2" /><path d="M7 14h10v7H7z" /></>);
export const IconTour = basis(<><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="6" r="2.2" /><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8" /></>);
export const IconKurs = basis(<><circle cx="12" cy="6" r="2.5" /><circle cx="5" cy="10" r="2" /><circle cx="19" cy="10" r="2" /><path d="M7.5 20c.4-3.6 2.2-5.6 4.5-5.6s4.1 2 4.5 5.6" /><path d="M2 18c.3-2.3 1.4-3.6 3-3.6M22 18c-.3-2.3-1.4-3.6-3-3.6" /></>);
export const IconAuto = basis(<><path d="M5 16V11l2-5h10l2 5v5" /><path d="M3 16h18v3h-3v-1H6v1H3z" /><circle cx="7.5" cy="13.5" r="1" /><circle cx="16.5" cy="13.5" r="1" /></>);
