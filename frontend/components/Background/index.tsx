import { cn } from "@/lib/utils";
import React from "react";

export default function Background({ children,
    className,
    containerClassName,
    animate = true, }: {
        children?: React.ReactNode;
        className?: string;
        containerClassName?: string;
        animate?: boolean;
    }) {
    return (
        <div className={cn("relative p-[4px] group", containerClassName, className)}>
            {/* <img src={"/bg/bg_fixed.png"} alt="" className="object-cover" />            */}
            {/* <img src={"/bg/bg_2.jpg"} alt="" className="object-cover" />           
            <img src={"/bg/bg_2.jpg"} alt="" className="object-cover" />           
            <img src={"/bg/bg_2.jpg"} alt="" className="object-cover" />           
            <img src={"/bg/bg_2.jpg"} alt="" className="object-cover" />           
            <img src={"/bg/bg_2.jpg"} alt="" className="object-cover" />            */}
        </div>
    );
}
