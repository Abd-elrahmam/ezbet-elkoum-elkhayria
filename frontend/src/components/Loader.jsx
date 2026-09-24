import { SyncLoader } from "react-spinners";

const Loader = ({ color = "#0d7c3e", size = 15, margin = 2, fullScreen = false }) => {
  const wrapperStyle = fullScreen
    ? {
        position: "fixed",
        inset: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "rgba(250, 248, 243, 0.85)",
        zIndex: 9999,
      }
    : {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px",
      };

  return (
    <div style={wrapperStyle}>
      <SyncLoader color={color} size={size} margin={margin} />
    </div>
  );
};

export default Loader;