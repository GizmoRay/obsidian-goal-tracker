import { CalendarData } from "./main";

export interface CalendarOptions {
	type: "daily" | "weekly" | "monthly";
	title: string;
	showStreak?: boolean;
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

		// Only set initial date if it's a new calendar (no goals yet)
		if (Object.keys(this.data.goals).length === 0) {
			const today = new Date();
			this.currentYear = today.getFullYear();
			this.currentMonth = today.getMonth();
		} else {
			// Try to get the date from URL parameters or default to current date
			const params = new URLSearchParams(window.location.hash.slice(1));
			this.currentYear = parseInt(
				params.get("year") || new Date().getFullYear().toString()
			);
			this.currentMonth = parseInt(
				params.get("month") || new Date().getMonth().toString()
			);
		}
	}

	private async updateGoal(dateString: string, isCompleted: boolean) {
		this.data.goals[dateString] = !isCompleted;
		await this.onUpdate(this.data);
	}

	private updateUrlParams() {
		// Update URL parameters without triggering a page reload
		const params = new URLSearchParams(window.location.hash.slice(1));
		params.set("year", this.currentYear.toString());
		params.set("month", this.currentMonth.toString());
		window.history.replaceState(null, "", `#${params.toString()}`);
	}

	// Update the navigation methods to maintain state
	private navigateToDate(year: number, month?: number) {
		this.currentYear = year;
		if (month !== undefined) {
			this.currentMonth = month;
		}
		this.updateUrlParams();
		this.render();
	}

	private calculateStreak(): number {
		if (!this.options.showStreak) return 0;

		const dates = Object.entries(this.data.goals)
			.filter(([_, completed]) => completed)
			.map(([date]) => date)
			.sort();

		if (dates.length === 0) return 0;

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (this.options.type === "daily") {
			// Convert string dates to Date objects and sort them in reverse chronological order
			const completedDates = dates
				.map((date) => new Date(date))
				.sort((a, b) => b.getTime() - a.getTime()); // Sort in reverse order

			let currentStreak = 0;
			let lastDate: Date | null = null;

			for (const date of completedDates) {
				if (date > today) continue; // Skip future dates

				if (!lastDate) {
					currentStreak = 1;
					lastDate = date;
					continue;
				}

				// Check if this date is consecutive with the last date
				const dayDiff = Math.round(
					(lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
				);
				if (dayDiff === 1) {
					currentStreak++;
					lastDate = date;
				} else {
					break; // Break on first gap - we only want the most recent streak
				}
			}
			return currentStreak;
		} else if (this.options.type === "weekly") {
			// Sort weeks in reverse chronological order
			const completedWeeks = dates
				.filter((date) => date.includes("-W"))
				.sort((a, b) => b.localeCompare(a)); // Sort in reverse order

			let currentStreak = 0;
			let prevWeek: string | null = null;

			for (const weekStr of completedWeeks) {
				const [year, week] = weekStr.split("-W").map(Number);
				if (!prevWeek) {
					currentStreak = 1;
					prevWeek = weekStr;
					continue;
				}

				const [prevYear, prevWeekNum] = prevWeek.split("-W").map(Number);
				// Check if weeks are consecutive
				if (
					(year === prevYear && week === prevWeekNum - 1) ||
					(year === prevYear - 1 && prevWeekNum === 1 && week === 52)
				) {
					currentStreak++;
					prevWeek = weekStr;
				} else {
					break; // Break on first gap
				}
			}
			return currentStreak;
		} else if (this.options.type === "monthly") {
			// Sort months in reverse chronological order
			const completedMonths = dates.sort((a, b) => b.localeCompare(a));

			let currentStreak = 0;
			let lastMonth: string | null = null;

			for (const monthStr of completedMonths) {
				const [year, month] = monthStr.split("-").map(Number);
				if (!lastMonth) {
					currentStreak = 1;
					lastMonth = monthStr;
					continue;
				}

				const [lastYear, lastMonthNum] = lastMonth.split("-").map(Number);
				// Check if months are consecutive
				if (
					(year === lastYear && month === lastMonthNum - 1) ||
					(year === lastYear - 1 && lastMonthNum === 1 && month === 12)
				) {
					currentStreak++;
					lastMonth = monthStr;
				} else {
					break; // Break on first gap
				}
			}
			return currentStreak;
		}

		return 0;
	}

	private renderStreakCounter() {
		if (!this.options.showStreak) return;

		const streak = this.calculateStreak();
		const streakContainer = this.container.createEl("div", {
			cls: "goal-tracker-streak",
		});

		// Get the correct plural form based on type
		const unit =
			this.options.type === "daily"
				? "day"
				: this.options.type === "weekly"
				? "week"
				: "month";

		streakContainer.createEl("span", {
			text: `Current streak: ${streak} ${unit}${streak !== 1 ? "s" : ""}`,
		});
	}

	render() {
		this.container.empty();

		// Add title
		this.container.createEl("h3", {
			text: this.options.title,
			cls: "goal-tracker-title",
		});

		// Add streak counter right after title
		this.renderStreakCounter();

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

		// For monthly view
		if (this.options.type === "monthly") {
			prevButton.addEventListener("click", () => {
				this.navigateToDate(this.currentYear - 1);
			});

			nextButton.addEventListener("click", () => {
				this.navigateToDate(this.currentYear + 1);
			});
			return;
		}

		// For daily and weekly views
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
			this.navigateToDate(
				this.currentYear,
				parseInt((e.target as HTMLSelectElement).value)
			);
		});

		prevButton.addEventListener("click", () => {
			if (this.currentMonth === 0) {
				this.navigateToDate(this.currentYear - 1, 11);
			} else {
				this.navigateToDate(this.currentYear, this.currentMonth - 1);
			}
			monthSelect.value = this.currentMonth.toString();
		});

		nextButton.addEventListener("click", () => {
			if (this.currentMonth === 11) {
				this.navigateToDate(this.currentYear + 1, 0);
			} else {
				this.navigateToDate(this.currentYear, this.currentMonth + 1);
			}
			monthSelect.value = this.currentMonth.toString();
		});
	}
}
