import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';

/** Pull the panel up so the pointer does not cross a dead gap below the nav label. */
const MENU_OVERLAP_PX = 6;
/** Invisible extension above the panel so hover stays continuous while moving from the button. */
const HOVER_BRIDGE_PX = 10;
const MENU_MIN_WIDTH_PX = 200;
const MENU_ELEVATION = 4;
const APP_BAR_Z_INDEX_BOOST = 2;

export interface NavHoverLink {
  label: string;
  to: string;
}

interface NavHoverGroupProps {
  label: string;
  hubTo: string;
  links: NavHoverLink[];
}

export default function NavHoverGroup({ label, hubTo, links }: NavHoverGroupProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  return (
    <Box
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      sx={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        alignSelf: 'center',
      }}
    >
      <Box ref={anchorRef}>
        <Button color="inherit" component={Link} to={hubTo}>
          {label}
        </Button>
      </Box>
      <Popper
        open={open && links.length > 0}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        disablePortal
        modifiers={[{ name: 'offset', options: { offset: [0, -MENU_OVERLAP_PX] } }]}
        sx={{ zIndex: (theme) => theme.zIndex.appBar + APP_BAR_Z_INDEX_BOOST }}
      >
        <Paper
          elevation={MENU_ELEVATION}
          sx={{
            minWidth: MENU_MIN_WIDTH_PX,
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: '100%',
              height: HOVER_BRIDGE_PX,
            },
          }}
        >
          <MenuList dense disablePadding autoFocusItem={false}>
            {links.map((link) => (
              <MenuItem
                key={link.to}
                component={Link}
                to={link.to}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </MenuItem>
            ))}
          </MenuList>
        </Paper>
      </Popper>
    </Box>
  );
}
