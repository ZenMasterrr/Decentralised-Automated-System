"use client"
import { useRouter } from "next/navigation"
import { Feature } from "./Feature"
import { Button } from "./ui/button"

export const Hero = () => {
    const router = useRouter();
    return <div>
        <div className="flex justify-center">
            <div className="text-5xl font-bold font-semibold text-center pt-8 max-w-xl">
                Decentralized Automation    
            </div>
        </div>
        <div className="flex justify-center pt-2">
            <div className="text-xl font-bold font-normal text-center pt-8 max-w-2xl">
                AI gives you automation superpowers, and Dteams puts them to work. Pairing AI and Dteams helps you turn ideas into workflows and bots that work for you.
            </div>
        </div>

        <div className="flex justify-center pt-4">
            <div className="flex">
                <Button onClick={() => {
                    router.push("/signup")
                }} size="lg">Get Started free</Button>
            </div>
        </div>
    </div>
}