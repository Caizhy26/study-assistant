import React from "react";
import TimerPage from "../../pages/TimerPage";

export default function StateHub(props) {
    return (
        <div style={{ height: "100%" }}>
            <TimerPage {...props} />
        </div>
    );
}
