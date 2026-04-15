import React, { useState } from "react";
import { STUDY_SUBTABS } from "../../constants/appConstants";
import PlanPage from "../../pages/PlanPage";
import TasksPage from "../../pages/TasksPage";
import ReviewPage from "../../pages/ReviewPage";
import SubTabBar from "./SubTabBar";

export default function StudyHub({ initialSubTab = "plan", ...props }) {
    const [sub, setSub] = useState(["plan", "tasks", "review"].includes(initialSubTab) ? initialSubTab : "plan");

    return (
        <div style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <SubTabBar tabs={STUDY_SUBTABS} active={sub} onChange={setSub} />
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                {sub === "plan" && <PlanPage {...props} />}
                {sub === "tasks" && <div style={{ height: "100%", overflowY: "auto", paddingRight: 2 }}><TasksPage {...props} /></div>}
                {sub === "review" && <div style={{ height: "100%", overflowY: "auto", paddingRight: 2 }}><ReviewPage {...props} /></div>}
            </div>
        </div>
    );
}
