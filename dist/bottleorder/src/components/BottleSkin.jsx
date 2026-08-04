import { useEffect, useState } from "react";
import { getSelectedBottleSkinSrc } from "../utils/selectedSkin";

function HiddenBottleOnly({ isSelected, onClick, className = '' }) {
  return (
    <button
      className={`hidden-bottle-only ${isSelected ? "selected" : ""} ${className}`}
      onClick={onClick}
      aria-label="Hidden bottle"
      type="button"
    >
      <svg
        className="hidden-bottle-svg"
        viewBox="0 0 100 130"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          className="hidden-bottle-outline"
          d="M40 8 H60 V34 L82 52 V118 Q82 124 76 124 H24 Q18 124 18 118 V52 L40 34 Z"
        />
        <text
          x="50"
          y="78"
          textAnchor="middle"
          dominantBaseline="middle"
          className="hidden-bottle-question"
        >
          ?
        </text>
      </svg>
    </button>
  );
}

export default function BottleSkin({ className = "", hidden = false, color, isSelected = false, onClick }) {
  const [skinSrc, setSkinSrc] = useState(getSelectedBottleSkinSrc());

  useEffect(() => {
    const updateSkin = () => {
      setSkinSrc(getSelectedBottleSkinSrc());
    };

    window.addEventListener("selectedBottleSkinChanged", updateSkin);
    window.addEventListener("storage", updateSkin);

    return () => {
      window.removeEventListener("selectedBottleSkinChanged", updateSkin);
      window.removeEventListener("storage", updateSkin);
    };
  }, []);

  // Add console log verification
  console.log("GAME IS USING SELECTED SKIN:", skinSrc);

  if (hidden) {
    return <HiddenBottleOnly isSelected={isSelected} onClick={onClick} className={className} />;
  }

  return (
    <img
      src={skinSrc}
      alt="Selected bottle skin"
      className={`bottle-skin ${className}`}
      draggable={false}
      style={{
        objectFit: "contain",
        objectPosition: "center bottom",
        background: "transparent"
      }}
    />
  );
}
