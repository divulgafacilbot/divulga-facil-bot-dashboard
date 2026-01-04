import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CampaignCard from './CampaignCard';

describe('User CampaignCard Component', () => {
  const mockCampaign = {
    id: 'campaign-456',
    name: 'Summer Sale Campaign',
    price: 149.90,
    product_url: 'https://example.com/summer-product',
    main_video_url: 'https://example.com/summer-video.mp4',
    created_at: '2026-01-04T15:30:00.000Z',
    asset_count: 8,
  };

  const mockOnDownload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render campaign name correctly', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('Summer Sale Campaign')).toBeInTheDocument();
  });

  it('should render campaign price in R$ format', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('R$ 149.90')).toBeInTheDocument();
  });

  it('should format price with two decimal places', () => {
    const campaignWithIntegerPrice = { ...mockCampaign, price: 100 };

    render(
      <CampaignCard
        campaign={campaignWithIntegerPrice}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('R$ 100.00')).toBeInTheDocument();
  });

  it('should format date in DD/MM/YYYY format', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText(/Criado em 04\/01\/2026/)).toBeInTheDocument();
  });

  it('should render product URL as a clickable link', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDownload={mockOnDownload}
      />
    );

    const productLink = screen.getByText('https://example.com/summer-product');
    expect(productLink).toBeInTheDocument();
    expect(productLink).toHaveAttribute('href', 'https://example.com/summer-product');
    expect(productLink).toHaveAttribute('target', '_blank');
    expect(productLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render main video URL as a clickable link', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDownload={mockOnDownload}
      />
    );

    const videoLink = screen.getByText('https://example.com/summer-video.mp4');
    expect(videoLink).toBeInTheDocument();
    expect(videoLink).toHaveAttribute('href', 'https://example.com/summer-video.mp4');
    expect(videoLink).toHaveAttribute('target', '_blank');
    expect(videoLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should show asset count badge when provided', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('8 arquivos')).toBeInTheDocument();
  });

  it('should not show asset count when not provided', () => {
    const campaignWithoutAssets = { ...mockCampaign, asset_count: undefined };

    render(
      <CampaignCard
        campaign={campaignWithoutAssets}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.queryByText(/arquivos/)).not.toBeInTheDocument();
  });

  it('should call onDownload when download button is clicked', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDownload={mockOnDownload}
      />
    );

    const downloadButton = screen.getByText('Download ZIP');
    fireEvent.click(downloadButton);

    expect(mockOnDownload).toHaveBeenCalledTimes(1);
    expect(mockOnDownload).toHaveBeenCalledWith('campaign-456');
  });

  it('should render download button with full width', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDownload={mockOnDownload}
      />
    );

    const downloadButton = screen.getByText('Download ZIP');
    expect(downloadButton).toHaveClass('w-full');
  });

  it('should render download button with correct styling', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDownload={mockOnDownload}
      />
    );

    const downloadButton = screen.getByText('Download ZIP');
    expect(downloadButton).toHaveClass('bg-[var(--color-secondary)]');
    expect(downloadButton).toHaveClass('text-white');
  });

  it('should have card hover effects', () => {
    const { container } = render(
      <CampaignCard
        campaign={mockCampaign}
        onDownload={mockOnDownload}
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('shadow-sm');
    expect(card).toHaveClass('hover:shadow-md');
    expect(card).toHaveClass('transition-shadow');
  });

  it('should render all campaign details sections', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('Summer Sale Campaign')).toBeInTheDocument();
    expect(screen.getByText('R$ 149.90')).toBeInTheDocument();
    expect(screen.getByText(/Criado em/)).toBeInTheDocument();
    expect(screen.getByText('URL do Produto:')).toBeInTheDocument();
    expect(screen.getByText('Vídeo Principal:')).toBeInTheDocument();
    expect(screen.getByText('Assets:')).toBeInTheDocument();
  });

  it('should not render delete button', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.queryByText('Excluir')).not.toBeInTheDocument();
  });

  it('should handle campaign with zero assets', () => {
    const campaignWithZeroAssets = { ...mockCampaign, asset_count: 0 };

    render(
      <CampaignCard
        campaign={campaignWithZeroAssets}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('0 arquivos')).toBeInTheDocument();
  });

  it('should render product URL label', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('URL do Produto:')).toBeInTheDocument();
  });

  it('should render video URL label', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('Vídeo Principal:')).toBeInTheDocument();
  });

  it('should have correct card border styling', () => {
    const { container } = render(
      <CampaignCard
        campaign={mockCampaign}
        onDownload={mockOnDownload}
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('border-[var(--color-border)]');
    expect(card).toHaveClass('rounded-xl');
  });

  it('should render price with primary color', () => {
    const { container } = render(
      <CampaignCard
        campaign={mockCampaign}
        onDownload={mockOnDownload}
      />
    );

    const priceElement = screen.getByText('R$ 149.90');
    expect(priceElement).toHaveClass('text-[var(--color-primary)]');
    expect(priceElement).toHaveClass('font-bold');
  });

  it('should format very small prices correctly', () => {
    const campaignWithSmallPrice = { ...mockCampaign, price: 0.99 };

    render(
      <CampaignCard
        campaign={campaignWithSmallPrice}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('R$ 0.99')).toBeInTheDocument();
  });

  it('should format large prices correctly', () => {
    const campaignWithLargePrice = { ...mockCampaign, price: 1999.99 };

    render(
      <CampaignCard
        campaign={campaignWithLargePrice}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('R$ 1999.99')).toBeInTheDocument();
  });
});
