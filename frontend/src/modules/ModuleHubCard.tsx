import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

const THUMB_HEIGHT = 160;

export interface ModuleHubCardProps {
  title: string;
  description: string;
  to: string;
  /** When set, shown as the card image; otherwise a neutral placeholder. */
  thumbnailUrl?: string | null;
  /**
   * Alt text when `thumbnailUrl` is set. Omit for decorative thumbs (title is repeated in the heading below).
   */
  thumbnailAlt?: string;
}

export default function ModuleHubCard({
  title,
  description,
  to,
  thumbnailUrl,
  thumbnailAlt = '',
}: ModuleHubCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', width: '100%' }}
    >
      <CardActionArea
        component={RouterLink}
        to={to}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          textAlign: 'left',
        }}
      >
        {thumbnailUrl ? (
          <Box
            component="img"
            src={thumbnailUrl}
            alt={thumbnailAlt}
            sx={{ width: '100%', height: THUMB_HEIGHT, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Box
            sx={{
              height: THUMB_HEIGHT,
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="caption" color="text.disabled">
              Thumbnail coming soon
            </Typography>
          </Box>
        )}
        <CardContent sx={{ flex: 1 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
