export interface Todo {
	id: string;
	text: string;
	done: boolean;
	order: number;
}

export interface Feature {
	id: string;
	boardId: string;
	epicId: string;
	title: string;
	description: string;
	order: number;
	todos: Todo[];
}

export interface Epic {
	id: string;
	boardId: string;
	name: string;
	order: number;
}
