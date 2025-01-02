import { Plugin, MarkdownPostProcessorContext, TFile } from "obsidian";
import { GoalCalendar, CalendarOptions } from "./goalCalendar";

export interface CalendarData {
	id: string;
	type: "daily" | "weekly" | "monthly";
	title: string;
	goals: {
		[date: string]: boolean;
	};
}

export default class GoalTrackerPlugin extends Plugin {
	async onload() {
		this.registerMarkdownCodeBlockProcessor(
			"goal-calendar",
			async (source, el, ctx) => {
				let calendarData: CalendarData;
				let options: CalendarOptions = {
					type: "daily",
					title: "Goal Tracker",
				};

				try {
					// Parse the source content
					const lines = source.trim().split("\n");

					// Parse options from the first lines
					while (lines.length > 0 && lines[0].includes(":")) {
						const [key, value] = lines[0].split(":");
						const trimmedKey = key.trim();
						const trimmedValue = value.trim();

						if (trimmedKey === "type") {
							options.type = trimmedValue as "daily" | "weekly" | "monthly";
						} else if (trimmedKey === "title") {
							options.title = trimmedValue;
						}
						lines.shift();
					}

					const jsonContent = lines.join("\n");
					if (jsonContent.trim()) {
						calendarData = JSON.parse(jsonContent);
					} else {
						calendarData = {
							id: crypto.randomUUID(),
							type: options.type,
							title: options.title,
							goals: {},
						};
					}

					// Ensure title is set in data
					calendarData.title = options.title;
				} catch (e) {
					console.error("Failed to parse calendar data", e);
					calendarData = {
						id: crypto.randomUUID(),
						type: options.type,
						title: options.title,
						goals: {},
					};
				}

				const calendar = new GoalCalendar(
					el,
					calendarData,
					options,
					async (updatedData) => {
						const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
						if (!(file instanceof TFile)) {
							console.error("Could not find source file");
							return;
						}

						const content = await this.app.vault.read(file);
						const sectionInfo = ctx.getSectionInfo(el);
						if (!sectionInfo) {
							console.error("Could not find section info");
							return;
						}

						const newContent = this.updateCalendarBlock(
							content,
							sectionInfo,
							`type: ${options.type}\ntitle: ${options.title}\n${JSON.stringify(
								updatedData,
								null,
								2
							)}`
						);

						await this.app.vault.modify(file, newContent);
					}
				);
				calendar.render();
			}
		);
	}

	private updateCalendarBlock(
		content: string,
		sectionInfo: { lineStart: number; lineEnd: number },
		newData: string
	): string {
		const lines = content.split("\n");
		const sectionStart = sectionInfo.lineStart;
		const sectionEnd = sectionInfo.lineEnd;

		const beforeSection = lines.slice(0, sectionStart + 1).join("\n");
		const afterSection = lines.slice(sectionEnd).join("\n");

		return `${beforeSection}\n${newData}\n${afterSection}`;
	}
}
