export const ChatBackground = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <svg width="100%" role="presentation" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="kawaii-pattern-light" patternUnits="userSpaceOnUse" width="80" height="80">
          {/* Dense Hearts */}
          <path
            d="M20,20 a5,5 0 0,1 10,0 a5,5 0 0,1 10,0 q0,10 -10,12.5 q-10,-2.5 -10,-12.5"
            fill="#FDA4AF"
            opacity="0.6"
          />
          <path
            d="M60,60 a4,4 0 0,1 8,0 a4,4 0 0,1 8,0 q0,8 -8,10 q-8,-2 -8,-10"
            fill="#FB7185"
            opacity="0.5"
          />

          {/* Flowers */}
          <path
            d="M50,30 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0 m4,-4 a4,4 0 1,0 0,8 a4,4 0 1,0 0,-8"
            fill="#F9A8D4"
            opacity="0.5"
          />
          <path
            d="M15,50 m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0 m3,-3 a3,3 0 1,0 0,6 a3,3 0 1,0 0,-6"
            fill="#FCE7F3"
            opacity="0.6"
          />

          {/* Stars */}
          <path
            d="M70,15 l1.5,4.5 h4.5 l-3.75,3 l1.5,4.5 l-3.75,-3 l-3.75,3 l1.5,-4.5 l-3.75,-3 h4.5 z"
            fill="#F43F5E"
            opacity="0.4"
          />
          <path
            d="M25,70 l1,3 h3 l-2.5,2 l1,3 l-2.5,-2 l-2.5,2 l1,-3 l-2.5,-2 h3 z"
            fill="#FF8FAB"
            opacity="0.5"
          />

          {/* Tiny dots */}
          <circle cx="40" cy="75" r="1.5" fill="#F43F5E" opacity="0.4" />
          <circle cx="75" cy="40" r="1.5" fill="#F43F5E" opacity="0.4" />
        </pattern>

        <pattern id="kawaii-pattern-dark" patternUnits="userSpaceOnUse" width="80" height="80">
          {/* Dense Hearts */}
          <path
            d="M20,20 a5,5 0 0,1 10,0 a5,5 0 0,1 10,0 q0,10 -10,12.5 q-10,-2.5 -10,-12.5"
            fill="#831843"
            opacity="0.6"
          />
          <path
            d="M60,60 a4,4 0 0,1 8,0 a4,4 0 0,1 8,0 q0,8 -8,10 q-8,-2 -8,-10"
            fill="#BE185D"
            opacity="0.5"
          />

          {/* Flowers */}
          <path
            d="M50,30 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0 m4,-4 a4,4 0 1,0 0,8 a4,4 0 1,0 0,-8"
            fill="#9D174D"
            opacity="0.5"
          />
          <path
            d="M15,50 m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0 m3,-3 a3,3 0 1,0 0,6 a3,3 0 1,0 0,-6"
            fill="#831843"
            opacity="0.6"
          />

          {/* Stars */}
          <path
            d="M70,15 l1.5,4.5 h4.5 l-3.75,3 l1.5,4.5 l-3.75,-3 l-3.75,3 l1.5,-4.5 l-3.75,-3 h4.5 z"
            fill="#BE185D"
            opacity="0.4"
          />
          <path
            d="M25,70 l1,3 h3 l-2.5,2 l1,3 l-2.5,-2 l-2.5,2 l1,-3 l-2.5,-2 h3 z"
            fill="#9D174D"
            opacity="0.5"
          />

          {/* Tiny dots */}
          <circle cx="40" cy="75" r="1.5" fill="#BE185D" opacity="0.4" />
          <circle cx="75" cy="40" r="1.5" fill="#BE185D" opacity="0.4" />
        </pattern>

        <linearGradient id="kawaii-gradient-light" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF1F2" />
          <stop offset="50%" stopColor="#FCE7F3" />
          <stop offset="100%" stopColor="#FFE4E6" />
        </linearGradient>

        <linearGradient id="kawaii-gradient-dark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#500724" />
          <stop offset="50%" stopColor="#4C0519" />
          <stop offset="100%" stopColor="#831843" />
        </linearGradient>
      </defs>

      <rect width="100%" height="100%" fill="url(#kawaii-gradient-light)" className="dark:hidden" />
      <rect
        width="100%"
        height="100%"
        fill="url(#kawaii-gradient-dark)"
        className="hidden dark:block"
      />
      <rect
        width="100%"
        height="100%"
        fill="url(#kawaii-pattern-light)"
        className="dark:hidden"
        opacity="0.4"
      />
      <rect
        width="100%"
        height="100%"
        fill="url(#kawaii-pattern-dark)"
        className="hidden dark:block"
        opacity="0.4"
      />
    </svg>
  </div>
);
