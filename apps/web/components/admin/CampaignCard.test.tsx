import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CampaignCard from './CampaignCard';

describe('Admin CampaignCard Component', () => {
  const mockCampaign = {
    id: 'campaign-123',
    name: 'Black Friday Campaign',
    price: 99.90,
    product_url: 'https://example.com/product',
    main_video_url: 'https://example.com/video.mp4',
    created_at: '2026-01-04T12:00:00.000Z',
    asset_count: 5,
  };

  const mockOnDelete = jest.fn();
  const mockOnDownload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render campaign name correctly', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDelete={mockOnDelete}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('Black Friday Campaign')).toBeInTheDocument();
  });

  it('should render campaign price in R$ format', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDelete={mockOnDelete}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('R$ 99.90')).toBeInTheDocument();
  });

  it('should format price with two decimal places', () => {
    const campaignWithIntegerPrice = { ...mockCampaign, price: 100 };

    render(
      <CampaignCard
        campaign={campaignWithIntegerPrice}
        onDelete={mockOnDelete}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('R$ 100.00')).toBeInTheDocument();
  });

  it('should render date in DD/MM/YYYY format', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDelete={mockOnDelete}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText(/Criado em 04\/01\/2026/)).toBeInTheDocument();
  });

  it('should render product URL as a link', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDelete={mockOnDelete}
        onDownload={mockOnDownload}
      />
    );

    const productLink = screen.getByText('https://example.com/product');
    expect(productLink).toBeInTheDocument();
    expect(productLink).toHaveAttribute('href', 'https://example.com/product');
    expect(productLink).toHaveAttribute('target', '_blank');
    expect(productLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render main video URL as a link', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDelete={mockOnDelete}
        onDownload={mockOnDownload}
      />
    );

    const videoLink = screen.getByText('https://example.com/video.mp4');
    expect(videoLink).toBeInTheDocument();
    expect(videoLink).toHaveAttribute('href', 'https://example.com/video.mp4');
    expect(videoLink).toHaveAttribute('target', '_blank');
    expect(videoLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render asset count when provided', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDelete={mockOnDelete}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('5 arquivos')).toBeInTheDocument();
  });

  it('should not render asset count when not provided', () => {
    const campaignWithoutAssets = { ...mockCampaign, asset_count: undefined };

    render(
      <CampaignCard
        campaign={campaignWithoutAssets}
        onDelete={mockOnDelete}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.queryByText(/arquivos/)).not.toBeInTheDocument();
  });

  it('should call onDownload when download button is clicked', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDelete={mockOnDelete}
        onDownload={mockOnDownload}
      />
    );

    const downloadButton = screen.getByText('Download ZIP');
    fireEvent.click(downloadButton);

    expect(mockOnDownload).toHaveBeenCalledTimes(1);
    expect(mockOnDownload).toHaveBeenCalledWith('campaign-123');
  });

  it('should call onDelete when delete button is clicked', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDelete={mockOnDelete}
        onDownload={mockOnDownload}
      />
    );

    const deleteButton = screen.getByText('Excluir');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
    expect(mockOnDelete).toHaveBeenCalledWith('campaign-123');
  });

  it('should render download button with correct styling', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDelete={mockOnDelete}
        onDownload={mockOnDownload}
      />
    );

    const downloadButton = screen.getByText('Download ZIP');
    expect(downloadButton).toHaveClass('bg-[var(--color-secondary)]');
    expect(downloadButton).toHaveClass('text-white');
  });

  it('should render delete button with correct styling', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDelete={mockOnDelete}
        onDownload={mockOnDownload}
      />
    );

    const deleteButton = screen.getByText('Excluir');
    expect(deleteButton).toHaveClass('border-red-500');
    expect(deleteButton).toHaveClass('text-red-500');
  });

  it('should have card shadow and transition effects', () => {
    const { container } = render(
      <CampaignCard
        campaign={mockCampaign}
        onDelete={mockOnDelete}
        onDownload={mockOnDownload}
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('shadow-sm');
    expect(card).toHaveClass('hover:shadow-md');
    expect(card).toHaveClass('transition-shadow');
  });

  it('should render all campaign details in correct sections', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDelete={mockOnDelete}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('Black Friday Campaign')).toBeInTheDocument();
    expect(screen.getByText('R$ 99.90')).toBeInTheDocument();
    expect(screen.getByText(/Criado em/)).toBeInTheDocument();
    expect(screen.getByText('URL do Produto:')).toBeInTheDocument();
    expect(screen.getByText('Vídeo Principal:')).toBeInTheDocument();
    expect(screen.getByText('Assets:')).toBeInTheDocument();
  });
});
