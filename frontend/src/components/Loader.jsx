import { PropagateLoader } from "react-spinners";

const Loader = ({ color = "#0d7c3e", size = 15 }) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px",
      }}
    >
      <PropagateLoader color={color} size={size} />
    </div>
  );
};

export default Loader;