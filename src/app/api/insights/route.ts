import { NextResponse } from "next/server";
import { getPublicPilotInsights } from "@/features/admin/firebase-pilot-insights";
export async function GET(){return NextResponse.json(await getPublicPilotInsights());}