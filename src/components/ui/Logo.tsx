import { getSupabaseImageUrl } from '../../utils/imageUtils';

type LogoProps = {
  className?: string;
  inverted?: boolean;
};

const Logo = ({ className = "", inverted = false }: LogoProps) => {
  const logoUrl = inverted 
    ? "https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logo/logo_white_science_hub%20no_title.png"
    : "https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logo/logo_gray_science_hub%20no_title.png";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={logoUrl}
        alt="ScienceHub Logo"
        className="h-8 w-auto"
      />
      <span 
        className={`font-heading font-bold text-xl ${inverted ? 'text-white' : 'text-dark-900 dark:text-white'}`}
      >
        ScienceHub
      </span>
    </div>
  );
};

export default Logo;