import { CalendarData } from "./main";

export interface CalendarOptions {
	type: "daily" | "weekly" | "monthly";
	title: string;
}

export class GoalCalendar {
	private currentYear: number;
	private currentMonth: number;
	private container: HTMLElement;
	private data: CalendarData;
	private options: CalendarOptions;
	private onUpdate: (data: CalendarData) => Promise<void>;

	constructor(
		container: HTMLElement,
		data: CalendarData,
		options: CalendarOptions,
		onUpdate: (data: CalendarData) => Promise<void>
	) {
		this.container = container;
		this.data = data;
		this.options = options;
		this.onUpdate = onUpdate;
		this.currentYear = new Date().getFullYear();
		this.currentMonth = new Date().getMonth();
	}

	render() {
		this.container.empty();

		// Add title
		this.container.createEl("h3", {
			text: this.options.title,
			cls: "goal-tracker-title",
		});

		this.renderCalendarControls();

		switch (this.options.type) {
			case "monthly":
				this.renderMonthlyView();
				break;
			case "weekly":
				this.renderWeeklyView();
				break;
			case "daily":
			default:
				this.renderDailyView();
		}
	}

	private renderMonthlyView() {
		const container = this.container.createEl("div", {
			cls: "goal-tracker-calendar monthly",
		});

		for (let month = 0; month < 12; month++) {
			const monthStr = (month + 1).toString().padStart(2, "0");
			const dateString = `${this.currentYear}-${monthStr}`;
			const isCompleted = this.data.goals[dateString] ?? false;

			const monthEl = container.createEl("div", {
				cls: `calendar-cell ${isCompleted ? "completed" : ""}`,
				text: new Date(2024, month).toLocaleString("default", {
					month: "short",
				}),
			});

			monthEl.addEventListener("click", async () => {
				this.data.goals[dateString] = !isCompleted;
				await this.onUpdate(this.data);
				monthEl.toggleClass("completed", !isCompleted);
			});
		}
	}

	private renderWeeklyView() {
		const container = this.container.createEl("div", {
			cls: "goal-tracker-calendar weekly",
		});

		// Get the first and last day of the month
		const firstDay = new Date(this.currentYear, this.currentMonth, 1);
		const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);

		// Find the Monday before or on the first day of the month
		let currentDate = new Date(firstDay);
		const dayOfWeek = currentDate.getDay();
		currentDate.setDate(
			currentDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
		);

		while (currentDate <= lastDay) {
			const weekEnd = new Date(currentDate);
			weekEnd.setDate(weekEnd.getDate() + 6);

			// Calculate week number and year for this week
			const weekNum = this.getWeekNumber(currentDate);
			const weekYear = this.getWeekYear(currentDate);

			// Only show the week if it belongs to the current month
			const weekMiddle = new Date(currentDate);
			weekMiddle.setDate(weekMiddle.getDate() + 3); // Thursday of the week
			const belongsToThisMonth =
				weekMiddle.getMonth() === this.currentMonth &&
				weekMiddle.getFullYear() === this.currentYear;

			if (belongsToThisMonth) {
				const weekEl = container.createEl("div", { cls: "week-row" });
				const dateString = `${weekYear}-W${weekNum}`;
				const isCompleted = this.data.goals[dateString] ?? false;

				// Format the date range
				const dateRange = `${currentDate.getDate()} ${currentDate.toLocaleString(
					"default",
					{ month: "short" }
				)} - ${weekEnd.getDate()} ${weekEnd.toLocaleString("default", {
					month: "short",
				})}`;

				const weekInfo = weekEl.createEl("div", { cls: "week-info" });
				weekInfo.createEl("span", {
					text: `Week ${weekNum}`,
					cls: "week-number",
				});
				weekInfo.createEl("span", { text: dateRange, cls: "week-dates" });

				const cell = weekEl.createEl("div", {
					cls: `calendar-cell ${isCompleted ? "completed" : ""}`,
				});

				cell.addEventListener("click", async () => {
					this.data.goals[dateString] = !isCompleted;
					await this.onUpdate(this.data);
					cell.toggleClass("completed", !isCompleted);
				});
			}

			currentDate.setDate(currentDate.getDate() + 7);
		}
	}

	private renderDailyView() {
		const container = this.container.createEl("div", {
			cls: "goal-tracker-calendar",
		});

		// Create weekday headers
		const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		const headerRow = container.createEl("div", {
			cls: "calendar-row",
		});
		weekdays.forEach((day) => {
			headerRow.createEl("div", { cls: "calendar-cell header", text: day });
		});

		// Get the first day of the month and total days
		const firstDay = new Date(this.currentYear, this.currentMonth, 1);
		const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
		const totalDays = lastDay.getDate();
		const startingDay = firstDay.getDay();

		let currentRow = container.createEl("div", { cls: "calendar-row" });

		// Add empty cells for days before the first of the month
		for (let i = 0; i < startingDay; i++) {
			currentRow.createEl("div", { cls: "calendar-cell empty" });
		}

		// Add days of the month
		for (let day = 1; day <= totalDays; day++) {
			if ((day + startingDay - 1) % 7 === 0 && day !== 1) {
				currentRow = container.createEl("div", { cls: "calendar-row" });
			}

			const dateString = `${this.currentYear}-${(this.currentMonth + 1)
				.toString()
				.padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
			const isCompleted = this.data.goals[dateString] ?? false;

			const cell = currentRow.createEl("div", {
				cls: `calendar-cell ${isCompleted ? "completed" : ""}`,
				text: day.toString(),
			});

			cell.addEventListener("click", async () => {
				this.data.goals[dateString] = !isCompleted;
				await this.onUpdate(this.data);
				cell.toggleClass("completed", !isCompleted);
			});
		}
	}

	private getWeekYear(date: Date): number {
		const d = new Date(date);
		d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
		return d.getFullYear();
	}

	private getWeekNumber(date: Date): number {
		const target = new Date(date.valueOf());
		const dayNr = (date.getDay() + 6) % 7;
		target.setDate(target.getDate() - dayNr + 3);
		const firstThursday = target.valueOf();
		target.setMonth(0, 1);
		if (target.getDay() !== 4) {
			target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
		}
		return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
	}

	private renderCalendarControls() {
		const controls = this.container.createEl("div", {
			cls: "goal-tracker-controls",
		});

		const prevButton = controls.createEl("button", { text: "←" });
		const yearSpan = controls.createEl("span", {
			text: this.currentYear.toString(),
			cls: "year-display",
		});
		const nextButton = controls.createEl("button", { text: "→" });

		// For monthly view, only handle year navigation
		if (this.options.type === "monthly") {
			prevButton.addEventListener("click", () => {
				this.currentYear--;
				yearSpan.textContent = this.currentYear.toString();
				this.render();
			});

			nextButton.addEventListener("click", () => {
				this.currentYear++;
				yearSpan.textContent = this.currentYear.toString();
				this.render();
			});
			return;
		}

		// For daily and weekly views, keep the existing month/year navigation
		const monthSelect = controls.createEl("select");
		const months = [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December",
		];

		months.forEach((month, index) => {
			const option = monthSelect.createEl("option", {
				text: month,
				value: index.toString(),
			});
			if (index === this.currentMonth) {
				option.selected = true;
			}
		});

		monthSelect.addEventListener("change", (e) => {
			this.currentMonth = parseInt((e.target as HTMLSelectElement).value);
			this.render();
		});

		prevButton.addEventListener("click", () => {
			if (this.currentMonth === 0) {
				this.currentMonth = 11;
				this.currentYear--;
			} else {
				this.currentMonth--;
			}
			monthSelect.value = this.currentMonth.toString();
			yearSpan.textContent = this.currentYear.toString();
			this.render();
		});

		nextButton.addEventListener("click", () => {
			if (this.currentMonth === 11) {
				this.currentMonth = 0;
				this.currentYear++;
			} else {
				this.currentMonth++;
			}
			monthSelect.value = this.currentMonth.toString();
			yearSpan.textContent = this.currentYear.toString();
			this.render();
		});
	}
}
