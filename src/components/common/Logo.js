import React from "react";
import KeyboardAltIcon from "@mui/icons-material/KeyboardAlt";

const Logo = ({ isFocusedMode, isMusicMode }) => {
  return (
    <div className="header" style={{visibility: isFocusedMode ? 'visible' : 'visible' }}>
      <h1>
        Key Sprints <KeyboardAltIcon fontSize="large" />
      </h1>
      <span className="sub-header">
        an elegant typing experience, just start typing
      </span>
    </div>
  );
};

export default Logo;
