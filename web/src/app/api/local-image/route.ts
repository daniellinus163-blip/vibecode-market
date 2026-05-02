import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";

export const runtime = "nodejs";

const LOCAL_IMAGES: Record<string, string> = {
  "1": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-b39210d3-48fd-4488-9392-609f5566b532.png",
  "2": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-d7c231e7-1c71-4879-8e57-9313d5fb4baf.png",
  "3": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-fa6e88af-6062-46c4-b703-ef60cc9c5807.png",
  "4": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-a3e208a0-3c7f-45ab-b0ba-452990bc8eda.png",
  "5": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-c12ac3d4-8713-4831-9278-7c53cdf90687.png",
  "6": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-dd591943-347c-4ecf-8f43-699c02e7c481.png",
  "7": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-48234429-0f89-4226-90b7-2f0c67f2c6e0.png",
  "8": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-dc595077-9dcc-401a-a661-46b690559699.png",
  "9": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-6345b9f7-ac81-4ed0-b6cf-23754ea429bc.png",
  "11": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-98f7a0a7-15ff-438a-9a85-d93c131d6b7d.png",
  "12": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-816fed23-8ba3-425f-b551-9160bc728442.png",
  "13": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-56aa54de-2a27-42c0-a2dc-398f05500a1f.png",
  "14": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-e65519cf-eee8-4f2b-b1e4-a03419f0dcc1.png",
  "15": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-1142f105-8196-487d-b8ef-b4c5d60b2f47.png",
  "16": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-0a04abdc-4a1b-4a6e-b7bb-8fcaa121f47d.png",
  "17": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-19e1fd1e-e8d9-4c1a-aac6-15da21e5233e.png",
  "18": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-fc97a38c-6f13-4dbc-8780-de397e965182.png",
  "19": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-7a15c968-3d2c-4672-8098-5620beeb0aa6.png",
  "20": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-a80ba7a4-3ae9-43ea-b361-1a62842ecfaf.png",
  "21": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-3b9c165e-c600-463a-bae6-ac86ab92ac5c.png",
  "22": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-177bdd69-591a-44fc-bdbe-2ed9446f7053.png",
  "23": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-f89b5629-9cec-4224-b680-0985912b5f6b.png",
  "24": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-c545faee-9740-45b8-8870-311b28549948.png",
  "25": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-e21db90a-a146-4c8b-8cc2-77eca421dec9.png",
  "26": "C:\\Users\\DELL\\.cursor\\projects\\c-Users-DELL-Desktop-vibecode-website\\assets\\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_8ccd7e146d30f6831f248cda1303a419_images_image-a23af933-e9c3-4479-afa1-579c75eba293.png",
};

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "1";
  const path = LOCAL_IMAGES[id] ?? LOCAL_IMAGES["1"];
  try {
    const buffer = await readFile(path);
    return new Response(buffer, {
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

