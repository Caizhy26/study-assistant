import React, { useState } from "react";
import { STUDY_SUBTABS } from "../../constants/appConstants";
import PlanPage from "../../pages/PlanPage";
import TasksPage from "../../pages/TasksPage";
import ReviewPage from "../../pages/ReviewPage";
import SubTabBar from "./SubTabBar";

export default function StudyHub({ initialSubTab = "plan", ...props }) {
    const [sub, setSub] = useState(["plan", "tasks", "review"].includes(initialSubTab) ? initialSubTab : "plan");

    return (
        <div>
            <SubTabBar tabs={STUDY_SUBTABS} active={sub} onChange={setSub} />
            {sub === "plan" && <PlanPage {...props} />}
            {sub === "tasks" && <TasksPage {...props} />}
            {sub === "review" && <ReviewPage {...props} />}
        </div>
    );
}
