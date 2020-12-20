import playlistParser from "https://jspm.dev/npm:iptv-playlist-parser@0.5.0!cjs";

interface Channels {
  name: string;
  tvg: {
    id: string;
    name: string;
    language: string;
    country: string;
    logo: string;
    url: string;
  };
  group: { title: string };
  http: { referrer: string; "user-agent": string };
  url: string;
  raw: string;
}

enum TypeLink {
  local = "local",
  remote = "remote",
}

interface Links {
  group: string;
  type: TypeLink;
  url: string;
}

await Deno.writeTextFile("./index.m3u", "#EXTM3U\n", { create: true });

const links: Links[] = await Deno.readTextFile("./links.json").then(
  (data: string) => {
    return JSON.parse(data);
  }
);

const values: Channels[][] = await Promise.all(
  links.map(async function (file): Promise<Channels[]> {
    let m3u = null;
    if (file.type === "remote") {
      const response = await fetch(file.url);
      m3u = await response.text();
    } else {
      m3u = await Deno.readTextFile(file.url);
    }
    // @ts-ignore
    return playlistParser.parse(m3u).items.map((item: Channels) => {
      item.group.title = file.group;
      return item;
    });
  })
);

values
  .flat()
  .filter((value: Channels, index, self: Channels[]) => {
    return index === self.findIndex((t: Channels) => t.url === value.url);
  })
  .sort((a: Channels, b: Channels) => {
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  })
  .forEach((v: Channels) => {
    return Deno.writeTextFileSync("./index.m3u", toString(v), { append: true });
  });

function toString(channels: Channels): string {
  let info =
    `-1 tvg-id="${channels.tvg.id}" ` +
    `tvg-name="${channels.tvg.name}" ` +
    `tvg-language="${channels.tvg.language}" ` +
    `tvg-logo="${channels.tvg.logo}" ` +
    `tvg-country="${channels.tvg.country}"` +
    `tvg-url="${channels.tvg.url}"` +
    `group-title="${channels.group.title}",${channels.name}`;

  if (channels.http["referrer"]) {
    info += `\n#EXTVLCOPT:http-referrer=${channels.http["referrer"]}`;
  }

  if (channels.http["user-agent"]) {
    info += `\n#EXTVLCOPT:http-user-agent=${channels.http["user-agent"]}`;
  }
  return "#EXTINF:" + info + "\n" + channels.url + "\n";
}
