import React, { useState } from "react";
import { STATE_SUBTABS } from "../../constants/appConstants";
import TimerPage from "../../pages/TimerPage";
import EnergyPage from "../../pages/EnergyPage";
import SubTabBar from "./SubTabBar";

export default function StateHub({ initialSubTab = "timer", ...props }) {
    const [sub, setSub] = useState(["timer", "energy"].includes(initialSubTab) ? initialSubTab : "timer");

    return (
        <div>
            <SubTabBar tabs={STATE_SUBTABS} active={sub} onChange={setSub} />
            {sub === "timer" && <TimerPage {...props} />}
            {sub === "energy" && <EnergyPage {...props} />}
        </div>
    );
}
