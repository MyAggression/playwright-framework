import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

const PAGE_URL = 'https://demo.playwright.dev/todomvc';

type FilterStatus = 'all' | 'active' | 'completed';

export class TodoPage extends BasePage {
  private readonly newTodoInput = this.page.locator('.new-todo');
  private readonly todoItems = this.page.locator('.todo-list li');
  private readonly toggleAllLabel = this.page.locator('label[for="toggle-all"]');
  private readonly todoCount = this.page.locator('.todo-count');

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto(PAGE_URL);
    await this.waitForPageLoad();
  }

  /**
   * Add a new todo item and wait for it to appear in the list.
   */
  async addTodo(text: string): Promise<void> {
    await this.newTodoInput.fill(text);
    await this.newTodoInput.press('Enter');
    await expect(this.todoItems.last()).toContainText(text);
  }

  /**
   * Toggle the completed state of a todo item by its visible text.
   */
  async completeTodo(text: string): Promise<void> {
    const item = this.todoItems.filter({ hasText: text });
    await item.locator('.toggle').click();
  }

  /**
   * Delete a todo item by hovering to reveal the destroy button.
   */
  async deleteTodo(text: string): Promise<void> {
    const item = this.todoItems.filter({ hasText: text });
    await item.hover();
    await item.locator('.destroy').click();
  }

  /**
   * Edit an existing todo by double-clicking its label and typing a new value.
   */
  async editTodo(oldText: string, newText: string): Promise<void> {
    const item = this.todoItems.filter({ hasText: oldText });
    await item.locator('label').dblclick();
    const editInput = item.locator('.edit');
    await expect(editInput).toBeVisible();
    await editInput.fill(newText);
    await editInput.press('Enter');
    await expect(item).toContainText(newText);
  }

  /**
   * Count todo items that are not yet completed.
   */
  async getActiveTodosCount(): Promise<number> {
    return this.todoItems.filter({ has: this.page.locator('.toggle:not(:checked)') }).count();
  }

  /**
   * Count todo items that have been completed.
   */
  async getCompletedTodosCount(): Promise<number> {
    return this.todoItems.filter({ has: this.page.locator('.toggle:checked') }).count();
  }

  /**
   * Click one of the three filter links (All, Active, Completed).
   */
  async filterBy(status: FilterStatus): Promise<void> {
    const hrefMap: Record<FilterStatus, string> = {
      all: '#/',
      active: '#/active',
      completed: '#/completed',
    };
    await this.page.locator(`.filters a[href="${hrefMap[status]}"]`).click();
  }

  /**
   * Click the "toggle all" control to mark every visible item complete.
   */
  async markAllComplete(): Promise<void> {
    await this.toggleAllLabel.click();
  }

  async getItemCount(): Promise<number> {
    return this.todoItems.count();
  }

  async getTodoCountText(): Promise<string> {
    return (await this.todoCount.textContent()) ?? '';
  }
}
