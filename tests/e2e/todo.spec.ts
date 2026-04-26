import { test, expect } from '@playwright/test';
import { TodoPage } from '../../pages/TodoPage';

test.describe('TodoMVC — CRUD and state management', () => {
  let todoPage: TodoPage;

  test.beforeEach(async ({ page }) => {
    todoPage = new TodoPage(page);
    await todoPage.navigate();
  });

  test.describe('Adding items — data-driven', () => {
    const todoItems = [
      'Write integration tests',
      'Review pull request',
      'Update test documentation',
      'Very long todo item that exceeds typical single-line length and tests boundary rendering conditions',
      'Special chars: @#$%^&*()',
      'Unicode: 日本語テスト',
    ];

    for (const text of todoItems) {
      test(`can add todo: "${text.slice(0, 40)}${text.length > 40 ? '…' : ''}"`, async () => {
        await todoPage.addTodo(text);
        expect(await todoPage.getItemCount()).toBe(1);
      });
    }
  });

  test.describe('CRUD operations', () => {
    test('add, complete, and delete a todo', async () => {
      await todoPage.addTodo('Buy groceries');

      await todoPage.completeTodo('Buy groceries');
      expect(await todoPage.getCompletedTodosCount()).toBe(1);
      expect(await todoPage.getActiveTodosCount()).toBe(0);

      await todoPage.deleteTodo('Buy groceries');
      expect(await todoPage.getItemCount()).toBe(0);
    });

    test('edit an existing todo', async () => {
      await todoPage.addTodo('Initial text');
      await todoPage.editTodo('Initial text', 'Edited text');

      expect(await todoPage.getItemCount()).toBe(1);
    });
  });

  test.describe('Persistence', () => {
    test('todos persist after page reload', async ({ page }) => {
      await todoPage.addTodo('Persistent item');
      await page.reload();
      await todoPage.waitForPageLoad();

      expect(await todoPage.getItemCount()).toBe(1);
    });
  });

  test.describe('Filters', () => {
    test.beforeEach(async () => {
      await todoPage.addTodo('Active task');
      await todoPage.addTodo('Completed task');
      await todoPage.completeTodo('Completed task');
    });

    test('All filter shows every item', async () => {
      await todoPage.filterBy('all');
      expect(await todoPage.getItemCount()).toBe(2);
    });

    test('Active filter shows only incomplete items', async () => {
      await todoPage.filterBy('active');
      expect(await todoPage.getItemCount()).toBe(1);
    });

    test('Completed filter shows only done items', async () => {
      await todoPage.filterBy('completed');
      expect(await todoPage.getItemCount()).toBe(1);
    });
  });

  test.describe('Bulk actions', () => {
    test('mark all as complete updates counts correctly', async () => {
      await todoPage.addTodo('Task one');
      await todoPage.addTodo('Task two');
      await todoPage.addTodo('Task three');

      await todoPage.markAllComplete();

      expect(await todoPage.getActiveTodosCount()).toBe(0);
      expect(await todoPage.getCompletedTodosCount()).toBe(3);
    });
  });
});
