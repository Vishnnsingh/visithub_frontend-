import { publicUploadUrl } from '../../lib/api';

export function OrgSplash({ name, logoFile }: { name: string; logoFile?: string | null }) {
  const logo = publicUploadUrl(logoFile);
  return (
    <div className="app-bg grid min-h-dvh place-items-center px-6">
      <div className="text-center">
        <span className="mx-auto grid size-20 place-items-center overflow-hidden rounded-[1.75rem] bg-primary text-3xl font-bold text-white shadow-sm">
          {logo ? <img src={logo} alt="" className="size-full object-cover" /> : name.slice(0, 1)}
        </span>
        <p className="mt-5 text-sm font-semibold tracking-[0.16em] text-mute uppercase">Welcome to</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">{name}</h1>
      </div>
    </div>
  );
}
