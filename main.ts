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
	private options: CalendarOptions;

	async onload() {
		this.registerMarkdownCodeBlockProcessor(
			"goal-calendar",
			async (source, el, ctx) => {
				let calendarData: CalendarData;
				this.options = {
					type: "daily",
					title: "Goal tracker",
					showStreak: false,
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
							this.options.type = trimmedValue as
								| "daily"
								| "weekly"
								| "monthly";
						} else if (trimmedKey === "title") {
							this.options.title = trimmedValue;
						} else if (trimmedKey === "streak") {
							this.options.showStreak = trimmedValue.toLowerCase() === "on";
						}
						lines.shift();
					}

					const jsonContent = lines.join("\n");
					if (jsonContent.trim()) {
						calendarData = JSON.parse(jsonContent);
					} else {
						calendarData = {
							id: crypto.randomUUID(),
							type: this.options.type,
							title: this.options.title,
							goals: {},
						};
					}

					// Ensure title is set in data
					calendarData.title = this.options.title;
				} catch (e) {
					console.error("Failed to parse calendar data", e);
					calendarData = {
						id: crypto.randomUUID(),
						type: this.options.type,
						title: this.options.title,
						goals: {},
					};
				}

				const calendar = new GoalCalendar(
					el,
					calendarData,
					this.options,
					async (updatedData) => {
						const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
						if (!(file instanceof TFile)) {
							console.error("Could not find source file");
							return;
						}

						await this.app.vault.process(file, (content) => {
							const sectionInfo = ctx.getSectionInfo(el);
							if (!sectionInfo) {
								console.error("Could not find section info");
								return content;
							}

							return this.updateCalendarBlock(
								content,
								sectionInfo,
								updatedData
							);
						});
					}
				);
				calendar.render();
			}
		);
	}

	private updateCalendarBlock(
		content: string,
		sectionInfo: { lineStart: number; lineEnd: number },
		updatedData: CalendarData
	): string {
		const lines = content.split("\n");
		const sectionStart = sectionInfo.lineStart;
		const sectionEnd = sectionInfo.lineEnd;

		const beforeSection = lines.slice(0, sectionStart + 1).join("\n");
		const afterSection = lines.slice(sectionEnd).join("\n");

		// Include all options in the output
		const optionsText = [
			`type: ${this.options.type}`,
			`title: ${this.options.title}`,
			this.options.showStreak ? "streak: on" : null,
		]
			.filter(Boolean)
			.join("\n");

		return `${beforeSection}\n${optionsText}\n${JSON.stringify(
			updatedData,
			null,
			2
		)}\n${afterSection}`;
	}
}
