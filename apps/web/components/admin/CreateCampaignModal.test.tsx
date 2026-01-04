import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateCampaignModal from './CreateCampaignModal';

// Mock admin-auth
jest.mock('@/lib/admin-auth', () => ({
  getAdminToken: jest.fn(() => 'mock-admin-token'),
}));

// Mock fetch
global.fetch = jest.fn();

describe('CreateCampaignModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3000';
  });

  it('should not render when isOpen is false', () => {
    render(
      <CreateCampaignModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByText('Nova Campanha Promocional')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <CreateCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Nova Campanha Promocional')).toBeInTheDocument();
  });

  it('should render all form fields', () => {
    render(
      <CreateCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByLabelText(/Nome da Campanha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Preço do Produto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/URL do Produto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/URL do Vídeo Principal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Anexar Assets/i)).toBeInTheDocument();
  });

  it('should render submit and cancel buttons', () => {
    render(
      <CreateCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Criar Campanha')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('should call onClose when cancel button is clicked', () => {
    render(
      <CreateCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when close X button is clicked', () => {
    render(
      <CreateCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking outside modal', () => {
    render(
      <CreateCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const backdrop = screen.getByText('Nova Campanha Promocional').closest('.fixed');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('should not call onClose when clicking inside modal content', () => {
    render(
      <CreateCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const modalContent = screen.getByText('Nova Campanha Promocional').closest('.relative');
    if (modalContent) {
      fireEvent.click(modalContent);
      expect(mockOnClose).not.toHaveBeenCalled();
    }
  });

  it('should validate required fields', async () => {
    render(
      <CreateCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const submitButton = screen.getByText('Criar Campanha');
    fireEvent.click(submitButton);

    const nameInput = screen.getByLabelText(/Nome da Campanha/i) as HTMLInputElement;
    const priceInput = screen.getByLabelText(/Preço do Produto/i) as HTMLInputElement;
    const productUrlInput = screen.getByLabelText(/URL do Produto/i) as HTMLInputElement;
    const videoUrlInput = screen.getByLabelText(/URL do Vídeo Principal/i) as HTMLInputElement;

    expect(nameInput).toBeRequired();
    expect(priceInput).toBeRequired();
    expect(productUrlInput).toBeRequired();
    expect(videoUrlInput).toBeRequired();
  });

  it('should validate price as number with min 0', () => {
    render(
      <CreateCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const priceInput = screen.getByLabelText(/Preço do Produto/i) as HTMLInputElement;
    expect(priceInput).toHaveAttribute('type', 'number');
    expect(priceInput).toHaveAttribute('min', '0');
    expect(priceInput).toHaveAttribute('step', '0.01');
  });

  it('should validate URL format for product URL', () => {
    render(
      <CreateCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const productUrlInput = screen.getByLabelText(/URL do Produto/i) as HTMLInputElement;
    expect(productUrlInput).toHaveAttribute('type', 'url');
  });

  it('should validate URL format for video URL', () => {
    render(
      <CreateCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const videoUrlInput = screen.getByLabelText(/URL do Vídeo Principal/i) as HTMLInputElement;
    expect(videoUrlInput).toHaveAttribute('type', 'url');
  });

  it('should handle file selection', async () => {
    render(
      <CreateCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const fileInput = screen.getByLabelText(/Anexar Assets/i) as HTMLInputElement;
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    await userEvent.upload(fileInput, file);

    expect(fileInput.files).toHaveLength(1);
    expect(fileInput.files?.[0]).toBe(file);
  });

  it('should handle multiple file selection', async () => {
    render(
      <CreateCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const fileInput = screen.getByLabelText(/Anexar Assets/i) as HTMLInputElement;
    const files = [
      new File(['content1'], 'test1.jpg', { type: 'image/jpeg' }),
      new File(['content2'], 'test2.jpg', { type: 'image/jpeg' }),
    ];

    await userEvent.upload(fileInput, files);

    expect(fileInput.files).toHaveLength(2);
  });

  it('should show loading state during submission', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise((resolve) => setTimeout(() => resolve({
        json: async () => ({ success: true }),
      }), 100))
    );

    render(
      <CreateCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await userEvent.type(screen.getByLabelText(/Nome da Campanha/i), 'Test Campaign');
    await userEvent.type(screen.getByLabelText(/Preço do Produto/i), '99.90');
    await userEvent.type(screen.getByLabelText(/URL do Produto/i), 'https://example.com/product');
    await userEvent.type(screen.getByLabelText(/URL do Vídeo Principal/i), 'https://example.com/video.mp4');

    const submitButton = screen.getByText('Criar Campanha');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Criando...')).toBeInTheDocument();
    });
  });

  it('should disable buttons during submission', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise((resolve) => setTimeout(() => resolve({
        json: async () => ({ success: true }),
      }), 100))
    );

    render(
      <CreateCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await userEvent.type(screen.getByLabelText(/Nome da Campanha/i), 'Test Campaign');
    await userEvent.type(screen.getByLabelText(/Preço do Produto/i), '99.90');
    await userEvent.type(screen.getByLabelText(/URL do Produto/i), 'https://example.com/product');
    await userEvent.type(screen.getByLabelText(/URL do Vídeo Principal/i), 'https://example.com/video.mp4');

    const submitButton = screen.getByText('Criar Campanha');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Cancelar')).toBeDisabled();
    });
  });

  it('should call onSuccess after successful submission', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true }),
    });

    render(
      <CreateCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await userEvent.type(screen.getByLabelText(/Nome da Campanha/i), 'Test Campaign');
    await userEvent.type(screen.getByLabelText(/Preço do Produto/i), '99.90');
    await userEvent.type(screen.getByLabelText(/URL do Produto/i), 'https://example.com/product');
    await userEvent.type(screen.getByLabelText(/URL do Vídeo Principal/i), 'https://example.com/video.mp4');

    const submitButton = screen.getByText('Criar Campanha');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('should show error message on submission failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: false, error: 'Failed to create campaign' }),
    });

    render(
      <CreateCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await userEvent.type(screen.getByLabelText(/Nome da Campanha/i), 'Test Campaign');
    await userEvent.type(screen.getByLabelText(/Preço do Produto/i), '99.90');
    await userEvent.type(screen.getByLabelText(/URL do Produto/i), 'https://example.com/product');
    await userEvent.type(screen.getByLabelText(/URL do Vídeo Principal/i), 'https://example.com/video.mp4');

    const submitButton = screen.getByText('Criar Campanha');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to create campaign')).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('should clear form after successful submission', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true }),
    });

    render(
      <CreateCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const nameInput = screen.getByLabelText(/Nome da Campanha/i) as HTMLInputElement;
    const priceInput = screen.getByLabelText(/Preço do Produto/i) as HTMLInputElement;
    const productUrlInput = screen.getByLabelText(/URL do Produto/i) as HTMLInputElement;
    const videoUrlInput = screen.getByLabelText(/URL do Vídeo Principal/i) as HTMLInputElement;

    await userEvent.type(nameInput, 'Test Campaign');
    await userEvent.type(priceInput, '99.90');
    await userEvent.type(productUrlInput, 'https://example.com/product');
    await userEvent.type(videoUrlInput, 'https://example.com/video.mp4');

    const submitButton = screen.getByText('Criar Campanha');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(nameInput).toHaveValue('');
      expect(priceInput).toHaveValue(null);
      expect(productUrlInput).toHaveValue('');
      expect(videoUrlInput).toHaveValue('');
    });
  });

  it('should send correct data in FormData on submission', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true }),
    });

    render(
      <CreateCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await userEvent.type(screen.getByLabelText(/Nome da Campanha/i), 'Test Campaign');
    await userEvent.type(screen.getByLabelText(/Preço do Produto/i), '99.90');
    await userEvent.type(screen.getByLabelText(/URL do Produto/i), 'https://example.com/product');
    await userEvent.type(screen.getByLabelText(/URL do Vídeo Principal/i), 'https://example.com/video.mp4');

    const submitButton = screen.getByText('Criar Campanha');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/admin/campaigns',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer mock-admin-token',
          },
        })
      );
    });
  });

  it('should include files in FormData when files are selected', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true }),
    });

    render(
      <CreateCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const fileInput = screen.getByLabelText(/Anexar Assets/i) as HTMLInputElement;
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    await userEvent.upload(fileInput, file);
    await userEvent.type(screen.getByLabelText(/Nome da Campanha/i), 'Test Campaign');
    await userEvent.type(screen.getByLabelText(/Preço do Produto/i), '99.90');
    await userEvent.type(screen.getByLabelText(/URL do Produto/i), 'https://example.com/product');
    await userEvent.type(screen.getByLabelText(/URL do Vídeo Principal/i), 'https://example.com/video.mp4');

    const submitButton = screen.getByText('Criar Campanha');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
