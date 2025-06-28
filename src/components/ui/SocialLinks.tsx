import { Twitter, Youtube, MessageSquare } from 'lucide-react';

type SocialLinksProps = {
  className?: string;
  iconSize?: number;
  inverted?: boolean;
};

const SocialLinks = ({ 
  className = "",
  iconSize = 24,
  inverted = false
}: SocialLinksProps) => {
  const linkClasses = inverted 
    ? "text-dark-300 hover:text-white" 
    : "text-dark-500 hover:text-primary-600 dark:text-dark-400 dark:hover:text-primary-400";

  return (
    <div className={className}>
      <a 
        href="https://t.me/sciencehub" 
        target="_blank" 
        rel="noopener noreferrer"
        className={`transition-colors ${linkClasses}`}
        aria-label="Telegram"
      >
        <MessageSquare size={iconSize} />
      </a>
      
      <a 
        href="https://vk.com/sciencehub" 
        target="_blank" 
        rel="noopener noreferrer"
        className={`transition-colors ${linkClasses}`}
        aria-label="VK"
      >
        <svg 
          width={iconSize} 
          height={iconSize} 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="transition-colors"
        >
          <path 
            d="M2 12C2 6.48 6.48 2 12 2C17.52 2 22 6.48 22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12ZM17.24 14.03C16.95 11.86 15.18 10.14 13.03 9.85V8.82C13.03 8.3 12.63 7.9 12.12 7.9H11.88C11.37 7.9 10.97 8.3 10.97 8.82V9.85C8.82 10.14 7.05 11.86 6.76 14.03C6.7 14.36 6.95 14.67 7.28 14.73C7.63 14.8 7.94 14.55 8 14.21C8.23 12.47 9.66 11.08 11.41 10.88C11.59 10.86 11.8 10.85 12 10.85C12.2 10.85 12.41 10.86 12.59 10.88C14.34 11.08 15.77 12.47 16 14.21C16.06 14.55 16.37 14.8 16.72 14.73C17.05 14.67 17.3 14.36 17.24 14.03Z" 
            fill="currentColor"
          />
        </svg>
      </a>
      
      <a 
        href="https://youtube.com/sciencehubrs" 
        target="_blank" 
        rel="noopener noreferrer"
        className={`transition-colors ${linkClasses}`}
        aria-label="YouTube"
      >
        <Youtube size={iconSize} />
      </a>
    </div>
  );
};

export default SocialLinks;