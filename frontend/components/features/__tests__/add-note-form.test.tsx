import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AddNoteForm } from '../add-note-form';

// Mock the server action
vi.mock('@/app/actions', () => ({
  addCustomerNoteAction: vi.fn().mockResolvedValue({}),
}));

describe('AddNoteForm component', () => {
  it('should render the textarea and submit button', () => {
    render(<AddNoteForm customerId="cust-123" />);
    expect(screen.getByPlaceholderText(/Type a new update/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument();
  });

  it('should update textarea value when typed into', () => {
    render(<AddNoteForm customerId="cust-123" />);
    const textarea = screen.getByPlaceholderText(/Type a new update/i) as HTMLTextAreaElement;
    
    fireEvent.change(textarea, { target: { value: 'This is a test note.' } });
    expect(textarea.value).toBe('This is a test note.');
  });
});
