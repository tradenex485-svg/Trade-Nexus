# Alert Components

Components for managing and displaying alerts in the Trade Nexus application.

## Purpose

These components handle:
- Alert configuration and rules
- Alert notifications
- Alert history and management
- Alert triggers and conditions
- Real-time alert displays

## Components

### Alert Configuration
Components for setting up alert rules:
- Alert rule builder
- Trigger condition forms
- Threshold configuration
- Notification preferences
- Alert scheduling

### Alert Display
Components for showing active alerts:
- Alert list/table
- Alert cards
- Alert badges
- Priority indicators
- Status indicators

### Alert Notifications
Real-time alert notification components:
- Toast notifications
- Alert banners
- Modal alerts
- Sound/visual indicators

### Alert Management
Components for managing alerts:
- Alert history viewer
- Alert acknowledgment
- Alert dismissal
- Alert filters and search

## Usage Examples

### Alert Configuration Form
```typescript
import { AlertConfigForm } from '@/components/alerts/alert-config-form';

<AlertConfigForm
  onSubmit={handleCreateAlert}
  initialValues={{
    name: 'Position Limit Alert',
    type: 'position_limit',
    threshold: 80,
    severity: 'high'
  }}
/>
```

### Alert List
```typescript
import { AlertList } from '@/components/alerts/alert-list';

<AlertList
  alerts={alerts}
  onAcknowledge={handleAcknowledge}
  onDismiss={handleDismiss}
/>
```

### Alert Badge
```typescript
import { AlertBadge } from '@/components/alerts/alert-badge';

<AlertBadge
  count={unreadAlertCount}
  severity="high"
/>
```

## Alert Types

The application supports various alert types:

### Trading Alerts
- Position limit warnings
- Market limit warnings
- Large trade notifications
- Price movement alerts

### Risk Alerts
- Risk threshold breaches
- Concentration warnings
- Exposure alerts
- Compliance violations

### System Alerts
- Data quality issues
- System errors
- Integration failures
- Performance warnings

## Alert Severity Levels

```typescript
type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

// Visual representation
const severityColors = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  info: 'bg-gray-500'
};
```

## Real-Time Updates

Alerts can be updated in real-time:

```typescript
import { useAlerts } from '@/hooks/use-alerts';

export function AlertMonitor() {
  const { alerts, subscribe } = useAlerts();

  useEffect(() => {
    const unsubscribe = subscribe((newAlert) => {
      // Handle new alert
      showNotification(newAlert);
    });

    return unsubscribe;
  }, [subscribe]);

  return <AlertList alerts={alerts} />;
}
```

## Best Practices

1. **Clear Messaging**: Alert text should be clear and actionable
2. **Severity Levels**: Use appropriate severity levels
3. **Dismissible**: Allow users to dismiss acknowledged alerts
4. **Persistence**: Store alert history for audit trails
5. **Performance**: Optimize for large numbers of alerts
6. **Accessibility**: Ensure alerts are screen reader friendly
7. **Mobile**: Alerts should work on mobile devices
