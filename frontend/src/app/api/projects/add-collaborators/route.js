import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { project_id, collaborator_ids } = await request.json();

    // Call the backend API to add collaborators
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/projects/add-collaborators`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id,
          collaborator_ids,
        }),

        //         "project_id": "f74ff961-1272-4326-b848-011176dbe473",
        // "collaborator_ids": [
        //   "fbb587f1-3b90-4e6d-813e-9ec06536d1ae"
        // ]
      }
    );

    if (!response.ok) {
      throw new Error("Failed to add collaborators");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to add collaborators:", error);
    return NextResponse.json(
      { success: false, message: "Failed to add collaborators" },
      { status: 500 }
    );
  }
}
